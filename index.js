import { ObjectPath } from '@lunjs/object-path';

// eslint-disable-next-line no-empty-function
const noop = () => {};

class Expander {
  constructor(obj, options) {
    this.root = obj;
    this.pathRefStack = [];
    this.objStack = [];
    this.skips = [];
    this.customGet = noop;
    this.objectPath = ObjectPath.escapeDotStyle;

    options = options || {};
    if (options.skips) {
      this.skips = options.skips.map((path) => {
        return new RegExp(`^${path.replace(/\[\*?\]/g, '\\[\\d+\\]')}$`);
      });
    }
    if (typeof options.get === 'function') {
      this.customGet = options.get;
    }
    this.replaceUndefinedWithEmptyString = options.replaceUndefinedWithEmptyString === true;
    if (options.objectPathStyle === 'quoteStyle') {
      this.objectPath = ObjectPath.quoteStyle;
    }
  }

  expand() {
    this.expandObject(this.root, '');
  }

  expandObject(obj, parentPath) {
    if (this.objStack.includes(obj)) {
      return;
    }
    this.objStack.push(obj);

    for (const key of Object.keys(obj)) {
      this.tryExpandItem(obj, key, parentPath ? `${parentPath}.${this.objectPath.keyPath.escape(key)}` : key);
    }

    this.objStack.pop();
  }

  expandArray(arr, parentPath) {
    if (this.objStack.includes(arr)) {
      return;
    }
    this.objStack.push(arr);

    for (let i = 0; i < arr.length; i++) {
      this.tryExpandItem(arr, i, `${parentPath}[${i}]`);
    }

    this.objStack.pop();
  }

  tryExpandItem(item, key, path) {
    const value = item[key];
    if (!value || this.skipPath(path)) {
      return;
    }

    if (typeof value === 'string') {
      item[key] = value.includes('${') ? this.expandString(value, path) : value;

    } else if (Object.prototype.toString.call(value) === '[object Object]') {
      this.expandObject(value, path);

    } else if (Array.isArray(value)) {
      this.expandArray(value, path);
    }
  }

  expandString(str, path) {
    this.pathRefStack.push(path);

    const data = {
      str,
      re: /(.*?)(?:(?:(\${)(.*?)(:-|}))|(}))/g
    };

    let value;
    do {
      const r = this.recursiveExpandRef(data);
      if (typeof r.value === 'undefined' && this.replaceUndefinedWithEmptyString) {
        r.value = '';
      }
      if (r.end) {
        r.value = `${r.value}}`;
      }

      value = this.concatAsString(value, r.value, true);
    } while (data.re.lastIndex !== 0 && data.re.lastIndex !== data.str.length);

    this.pathRefStack.pop();
    return value;
  }

  recursiveExpandRef(data, skipGetValue = false) {
    let value;
    let ref = 0;
    let end = false;

    do {
      const lastIndex = data.re.lastIndex;
      const matches = data.re.exec(data.str);
      if (!matches) {
        if (!skipGetValue) {
          value = this.concatAsString(value, data.str.substring(lastIndex), ref === 0);
        }
        break;
      }

      if (!skipGetValue && matches[1]) {
        value = this.concatAsString(value, matches[1], ref === 0);
      }

      if (matches[2]) {
        ref++;
        let val;
        if (!skipGetValue) {
          val = this.get(matches[3]);
        }

        if (matches[4] === ':-') {
          const isValUndefined = typeof val === 'undefined';
          const r = this.recursiveExpandRef(data, !isValUndefined || skipGetValue);
          if (!r.end) {
            throw new SyntaxError(`'}' is missing in the string ${data.str}`);
          }
          if (isValUndefined) {
            val = r.value;
          }
        }

        if (!skipGetValue) {
          value = this.concatAsString(value, val, ref <= 1);
        }
        continue;
      }

      if (matches[5]) {
        if (!skipGetValue && typeof value === 'undefined' && !ref) {
          value = '';
        }
        end = true;
        break;
      }

    } while (data.re.lastIndex !== data.str.length);

    return { value, end };
  }

  concatAsString(a, b, ignoreUndefined) {
    if (typeof a === 'undefined') {
      if (ignoreUndefined) {
        return b;
      }
      if (this.replaceUndefinedWithEmptyString) {
        a = '';
      }
    }

    if (typeof b === 'undefined' && this.replaceUndefinedWithEmptyString) {
      b = '';
    }
    return `${a}${b}`;
  }

  get(path) {
    let value = this.customGet(path);
    if (typeof value !== 'undefined') {
      return value;
    }

    if (this.pathRefStack.includes(path)) {
      throw new Error(`Circular dependency: ${this.pathRefStack.join(' -> ')} -> ${path}`);
    }

    value = this.objectPath.get(this.root, path);
    if (typeof value !== 'string') {
      return value;
    }

    if (!value.includes('${')) {
      return value;
    }

    value = this.expandString(value, path);
    this.objectPath.set(this.root, path, value);
    return value;
  }

  skipPath(path) {
    return this.skips.some(re => re.test(path));
  }
}

export function expandVar(value, options) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('"value" is not an object');
  }

  new Expander(value, options).expand();
}
