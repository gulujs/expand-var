# @lunjs/expand-var

## Installation

```sh
npm install @lunjs/expand-var
```

## Usage

```js
import { expandVar } from '@lunjs/expand-var';

const config = {
  host: 'example.com',
  port: '8080',
  url: 'https://${host}:${port}'
};
expandVar(config);

console.log(config);
/*
{
  host: 'example.com',
  port: '8080',
  url: 'https://example.com:8080'
}
*/
```

## License

[MIT](LICENSE)
