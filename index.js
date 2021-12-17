import get from 'lodash.get';
import set from 'lodash.set';

const VARIABLE_REPLACE_REGEXP = /\$\{([^}]*?)\}/g;
const VARIABLE_TEST_REGEXP = /\$\{([^}]*?)\}/;
const VARIABLE_SINGLE_REGEXP = /^\$\{([^}]*?)\}$/;
// eslint-disable-next-line no-empty-function
const noop = () => {};

class Expander {
  constructor(obj, options) {
    this.root = obj;
    this.pathRefStack = [];
    this.objStack = [];
    this.skips = [];
    this.customGet = noop;

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
      this.tryExpandItem(obj, key, parentPath ? `${parentPath}.${key}` : key);
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
    const val = item[key];
    if (!val || this.skipPath(path)) {
      return;
    }

    if (typeof val === 'string') {
      item[key] = this.expandString(val, path);

    } else if (Object.prototype.toString.call(val) === '[object Object]') {
      this.expandObject(val, path);

    } else if (Array.isArray(val)) {
      this.expandArray(val, path);
    }
  }

  expandString(str, path) {
    let val;
    this.pathRefStack.push(path);

    const m = str.match(VARIABLE_SINGLE_REGEXP);
    if (m) {
      val = this.get(m[1]);
      if (typeof val === 'undefined') {
        val = this.replaceUndefinedWithEmptyString ? '' : m[0];
      }

    } else {
      val = str.replace(VARIABLE_REPLACE_REGEXP, (match, path) => {
        const val = this.get(path);
        if (typeof val === 'undefined') {
          return this.replaceUndefinedWithEmptyString ? '' : match;
        }
        return val;
      });
    }

    this.pathRefStack.pop();
    return val;
  }

  get(path) {
    let val = this.customGet(path);
    if (typeof val !== 'undefined') {
      return val;
    }

    if (this.pathRefStack.includes(path)) {
      throw new Error(`Circular dependency: ${this.pathRefStack.join(' -> ')} -> ${path}`);
    }

    val = get(this.root, path);
    if (typeof val !== 'string') {
      return val;
    }

    if (!VARIABLE_TEST_REGEXP.test(val)) {
      return val;
    }

    val = this.expandString(val, path);
    set(this.root, path, val);
    return val;
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
