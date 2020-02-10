# GSAP SCROLL

## 개요
* `gsap3`용 scroll 플러그인.

## install
Using npm
```sh
$ npm install gsap-scroll
```
Using yarn
```sh
$ yarn gsap-scroll
```

## Example
```js
import gsap from 'gsap';
import g from 'gsapScroll';

const tl = gsap.timeline({ paused: true });
tl.to(el, {y: 400});

const tl2 = gsap.timeline({ paused: true });
tl2.fromTo('#box2',
  {x: '-=200px', autoAlpha: 0},
  {y: 300, x: 200, autoAlpha: 1}
);

g.progress([tl, tl2], {
      triggerEl: '#container',
      fixedEl: '#fixed',
      duration: 400,
      triggerYPercent: 20,
      smooth: 0.05,
      showIndicator: true,
      startIndicatorName: '시당근',
      endIndicatorName: '끝당근',
      triggerIndicatorName: '트리근',
    });
```
