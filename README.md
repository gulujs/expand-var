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
  url: 'https://www.${host}:${port:-8080}'
};
expandVar(config);

console.log(config);
/*
{
  host: 'example.com',
  url: 'https://www.example.com:8080'
}
*/
```

## License

[MIT](LICENSE)
