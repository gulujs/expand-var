import { expect } from 'chai';
import { expandVar } from './index.js';

describe('expand', () => {
  it('should throw TypeError', () => {
    expect(() => expandVar('')).to.throw('"value" is not an object');
  });

  it('should remain unchanged', () => {
    const obj = { foo: '${wow}', bar: 'bar ${wow}' };
    expandVar(obj);
    expect(obj).to.deep.equal({ foo: '${wow}', bar: 'bar ${wow}' });
  });

  it('should expand empty string', () => {
    const obj = { foo: '${wow}', bar: 'bar ${wow}' };
    expandVar(obj, { replaceUndefinedWithEmptyString: true });
    expect(obj).to.deep.equal({ foo: '', bar: 'bar ' });
  });

  it('should expand variable', () => {
    const obj = {
      foo: 'hello',
      bar: '${foo}'
    };
    expandVar(obj);
    expect(obj).to.deep.equal({
      foo: 'hello',
      bar: 'hello'
    });
  });

  it('should expand deep variable', () => {
    const obj = {
      foo: {
        bar: { boo: 'boo!' },
        wow: ['wow!']
      },
      hello: {
        boo: 'Hello ${foo.bar.boo}',
        wow: 'Hello ${foo.wow[0]}'
      }
    };
    expandVar(obj);
    expect(obj).to.deep.equal({
      foo: {
        bar: { boo: 'boo!' },
        wow: ['wow!']
      },
      hello: {
        boo: 'Hello boo!',
        wow: 'Hello wow!'
      }
    });
  });

  it('should expand recursive variable', () => {
    const obj = {
      foo: 'foo ${bar}',
      bar: 'bar ${wow}',
      wow: 'wow!'
    };
    expandVar(obj);
    expect(obj).to.deep.equal({
      foo: 'foo bar wow!',
      bar: 'bar wow!',
      wow: 'wow!'
    });
  });

  it('should throw Circular dependency Error', () => {
    const obj = {
      foo: '${bar}',
      bar: '${wow}',
      wow: '${foo}'
    };
    expect(() => expandVar(obj)).to.throw(/Circular dependency/);
  });

  it('should skip expand variable', () => {
    const obj = {
      age: 1,
      foo: {
        bar: [
          { name: '${name}', age: '${age}' },
          { name: '${name}', age: '${age}' }
        ],
        wow: '${non}'
      }
    };
    expandVar(obj, {
      skips: [
        'foo.bar[*].name',
        'foo.wow'
      ]
    });
    expect(obj).to.deep.equal({
      age: 1,
      foo: {
        bar: [
          { name: '${name}', age: 1 },
          { name: '${name}', age: 1 }
        ],
        wow: '${non}'
      }
    });
  });

  it('should expand variable by custom get', () => {
    const obj = {
      foo: 'foo ${bar}',
      bar: '${BAR}'
    };
    expandVar(obj, {
      get(path) {
        if (path === 'BAR') {
          return 'bar!';
        }
      }
    });
    expect(obj).to.deep.equal({
      foo: 'foo bar!',
      bar: 'bar!'
    });
  });

  it('should expand circular referenced object', () => {
    const obj = {
      a: '${b.c}',
      b: {
        c: '${b}'
      },
      d: '${e[0].f}',
      e: [{ f: '${e}' }]
    };
    expandVar(obj);
    expect(obj.a).to.equal(obj.b.c);
    expect(obj.b.c).to.equal(obj.b);
    expect(obj.d).to.equal(obj.e[0].f);
    expect(obj.e[0].f).to.equal(obj.e);
  });
});
