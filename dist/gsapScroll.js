import gsap from 'gsap';
const _ = {};
const L = {}; // 지연적으로 동작하는 함수에 네임 스페이스 적용.
_.log = console.log;

/** ============================================================
 * @ 커링
 * 인자가 2개 이상일 경우는 함수에 인자를 전부 넘기면서 실행을 하고
 * 인자가 1개일 경우는 다음에 ...bs를 받는 함수를 리턴하면서
 * 다음번에 실행되도록 한다.
 ============================================================ */
const curry = f => (a, ...bs) =>
  bs.length ? f(a, ...bs) : (...bs) => f(a, ...bs);


/** ============================================================
 * @ 지정된만큼 값을 저장 후 리턴
 ============================================================ */
const take = curry(function (length, iter){
  let res = [];
  for(const a of iter){
    // 순회한 값을 배열에 집어 넣는다.
    res.push(a);
    // 지정된 length 와 length가 같을 경우에는 저장된 값을 리터
    if(res.length === length) { return res; }
  }
  return res;
});

/** ============================================================
 * @ 전체 평가
============================================================ */
const takeAll = (iter) => {
  return take(Infinity, iter);
};


// const map = curry((f, iter) => {
//   return takeAll(L.map(f, iter));
// });


// const each = curry((f, iter) => {
//   return map(a => go1(f(a), s => a), iter);
// });


/** ============================================================
 * @ 누적 처리를 함수에게 위임 한다.
 ============================================================ */
const reduce = curry(function(f, acc, iter) {
  // 3번째가 아닌 2번째 파라메터가 이터레이터 일 경우 처리.
  if(arguments.length === 2){
    iter = acc[Symbol.iterator](); // acc의 iterator을 넘김.
    acc = iter.next().value;
  }

  for(const a of iter){
    acc = f(acc, a);
  }
  return acc;
});


/** ============================================================
 * @ 리스트가 있다면 함수에 값을 넘겨 주면서 실행 시킨다.
 ============================================================ */
L.map = curry(function*(f, iter){
  for(const a of iter){
    yield f(a);
  }
});

/** ============================================================
 * @ 함수 자체를 축약.
 * a로 시작해서 함수가 들어올 함수로 누적해 나간다.
 * 실행되면 다음과 같은형태로 동작한다. eg) add(add(1, 2), 3)
 ============================================================ */
const go1 = (a, f) => a instanceof Promise ? a.then(f) : f(a);
const go = (...as) => reduce(go1, as);


/** ============================================================
* @ 현재 애니메이션의 시간동안 움직일 시간 비율을 구한다.
============================================================ */
const getProgress = ({ startY, duration, triggerYPercent }) => {
  const scrollY = window.scrollY;
  const winHeight = window.innerHeight;
  // _.log('> getProgress : ', startY, duration, triggerYPercent, scrollY, winHeight );
  return Math.max((scrollY - startY + (winHeight * triggerYPercent / 100) ) / duration, 0);
};


/** ============================================================
* @ 현재 프로그래스 셋팅
============================================================ */
const setCurProgress = curry((f, data) => {
  data.curProgress = getProgress(data);
  if(f) { f(data); }
});



/** ============================================================
* @ 스무스 애니메이션
============================================================ */
const smoothProgress = (data) => {
  data.ticker = () => {
    const { curProgress, tl, smooth } = data;
    if(curProgress !== undefined){
      let progress = tl.progress();
      progress += (curProgress - progress) * smooth;
      tl.progress(progress);
    }
  };
  gsap.ticker.add(data.ticker);
}


/** ============================================================
* @ fixed 상태별 처리
============================================================ */
const fixedState = {};
// # 애니메이션 시작 전
fixedState.before = (data) => {
  const {els} = data;
  data.onFixed.status = 'before';
  els.fixedWrapper.style.position = 'static';
  els.fixedWrapper.style.width  = `auto`;
  els.fixedWrapper.style.height  = `0px`;
  els.fixedEl.style.position = 'relative';
  els.fixedEl.style.top = `auto`;
  els.fixedEl.style.width = `${data.onFixed.width}px`;
  els.fixedEl.style.height = `${data.onFixed.height}px`;
};

// # 애니메이션 중
fixedState.ing = (data) => {
  const {els, triggerYPercent} = data;
  data.onFixed = {
    status: 'ing',
    width: els.fixedEl.offsetWidth,
    height : els.fixedEl.offsetHeight
  };
  els.fixedWrapper.style.position = 'relative';
  els.fixedWrapper.style.width  = `${data.onFixed.width}px`;
  els.fixedWrapper.style.height  = `${data.onFixed.height}px`;
  els.fixedEl.style.position = `fixed`;
  els.fixedEl.style.top = `${triggerYPercent}%`;
  els.fixedEl.style.width = `${data.onFixed.width}px`;
  els.fixedEl.style.height = `${data.onFixed.height}px`;
};

// # 애니메이션 완료
fixedState.completed = (data) => {
  const {els, duration} = data;
  // _.log('> log : ', data.onFixed, els.fixedEl.offsetWidth);
  data.onFixed = {
    status: 'completed',
    width: els.fixedEl.offsetWidth,
    height : els.fixedEl.offsetHeight
  };
  els.fixedWrapper.style.position = 'relative';
  els.fixedWrapper.style.width  = `${data.onFixed.width}px`;
  els.fixedWrapper.style.height  = `${data.onFixed.height}px`;
  els.fixedEl.style.position = `absolute`;
  els.fixedEl.style.top = `${duration}px`;
  els.fixedEl.style.width = `${data.onFixed.width}px`;
  els.fixedEl.style.height = `${data.onFixed.height}px`;
}



/** ============================================================
* @ 스크롤 이벤트 콜백
* . removeEvenetListener을 하기 위함.
============================================================ */
const scrollEvtCallback = (f, data) => (evt) => {
  if(f){ f(data); }
  // _.log('> ', data.curProgress)
  if(data.fixedEl) {
    // # 시작전
    if(data.curProgress <= 0 && data.onFixed.status !== 'before') {
      fixedState.before(data);
    }
    // # 애니메이션 중
    else if(data.curProgress > 0 && data.curProgress <= 1 && data.onFixed.status !== 'ing') {
      fixedState.ing(data);
    }
    // # 완료
    else if(data.curProgress > 1 && data.onFixed.status !== 'completed'){
      fixedState.completed(data);
    }
  }
};

/** ============================================================
* @ 스크롤 이벤트 바인딩
============================================================ */
const bindScEvt = curry((f, data) => {
  data.scrollEventFunc = scrollEvtCallback(f, data);
  window.addEventListener('scroll', data.scrollEventFunc, false);
});

/** ============================================================
* @ 이벤트 콜백 연결
============================================================ */
const bindEventCallback = (data) => {
  const {tl, onStart, onUpdate} = data;

  // # 시작 이벤트
  tl.eventCallback('onStart', () => {
    if(onStart) {
      onStart(data);
    }
  });
  // # 업데이트
  if(onUpdate) { tl.eventCallback('onUpdate', () => onUpdate(data)); }

  // # 완료 이벤트
  tl.eventCallback('onComplete', () => {
    // # fixedEl을 지정했을 경우
    if(data.fixedEl) {
      fixedState.completed(data);
    }
    // # 콜백 있을 경우 실행
    if(data.onComplete) {
      data.onComplete(data);
    }
    // # 애니메이션을 한번만 할 경우
    if(data.once === true) {
      kill(data);
    }
  });
};


/** ============================================================
 * @ 스크롤 이벤트
============================================================ */
const evt = {};
// ===== progress
evt.progress = (data) => {
  bindScEvt(
    setCurProgress(
      ({tl, curProgress, smooth}) => {if(smooth === 1){tl.progress(curProgress)}}
    )
  , data);
  // # smooth 적용
  if(data.smooth !== 1) {
    smoothProgress(data);
  }
  return data;
};

// ===== trigger
evt.trigger = (data) => {
  bindScEvt(
    setCurProgress(
      ({tl, curProgress}) => (curProgress > 0) ? tl.play() : tl.reverse()
    )
  , data);
  return data;
};


/** ============================================================
  * @ indicator 엘리먼트 생성
============================================================ */
const fixedElWrapperTemplate = () =>
  `<div style="top:auto;bottom:auto;left:auto;right:auto;margin:auto;display:block;width:auto;min-width:1px;line-height:0;height:0;"></div>`;

const indicatorTemplate = ({startY, endY, type, startIndicatorName, endIndicatorName}) =>
  `<div style="position:absolute;right:20px;top:${startY}px;overflow:visible;white-space:nowrap;font-size:0.8rem;z-index:10000;text-align:right;">
    <div style="padding:0 5px;border-bottom:1px solid;line-height:0.9rem;color:blue;min-width:20px;margin-top:-0.9rem">${startIndicatorName}</div>
    ${type === 'progress' ? `<div style="position:absolute;top:${endY}px;padding:0 5px;border-top:1px solid;line-height:0.9rem;color:red;min-width:20px;">${endIndicatorName}</div>` : ''}
  </div>`;

const triggerTemplate = ({triggerYPercent, triggerIndicatorName}) =>
  `<div style="position:fixed;right:20px;top:${triggerYPercent}%;overflow:visible;white-space:nowrap;font-size:0.8rem;line-height:0.9rem;z-index:10001;">
    <div style="color:green;line-height:0.95rem;border-bottom:1px solid;min-width:50px;">
      <div style="position:absolute;top:-0.9rem;">${triggerIndicatorName}</div>
    </div>
  </div>`;


/** ============================================================
  * @ 텍스트를 엘리먼트로 변경.
============================================================ */
const el = html => {
  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  return wrap.children[0];
};


/** ============================================================
  * @ 다른 엘리먼트로 덮어 싸기
============================================================ */
const wrapEl = (_el, _wrapper) => {
  _el.parentNode.insertBefore(_wrapper, _el);
  _wrapper.appendChild(_el);
};



/** ============================================================
 * @ 엘리먼트내에 다른 엘리먼트 덧붙임.
============================================================ */
const append = (parent, child) => parent.appendChild(child);


/** ============================================================
 * @ 시작
============================================================ */
const play = (type) => (tls, options) => {
  const els = setElement(options); // 엘리먼트 셋팅
  return go(
    tls,
    L.map(setOptions({...options, els, type})), // 옵션 셋팅
    L.map(a => (evt[type](a), a)), // 스크롤 이벤트 바인딩
    L.map(a => (bindEventCallback(a), a)), // 이벤트 콜백 바인딩
    takeAll, // 전체 평가
    tls => (tls[0].showIndicator && indicator(tls[0]), tls), // indicator 생성
    a => (window.scrollBy(window.scrollX, 1), a), // 스크롤 이벤트
    a => ({tls: a, killAll: () => killAll(a), els }) // 리턴 데이터 추가
  );
};

/** ============================================================
 * @ 옵션셋팅
============================================================ */
const setOptions = curry(({els, ..._options}, tl) => {
  const options = {
    type: 'progress', // 애니메이션 방식("trigger"[트리거로 한번만 실행], "progress"[duration동안 실행])
    triggerEl: undefined, // 트리거의 기준이 되는 엘리먼트.
    fixedEl: undefined, // onComplete 발생시까지 고정된다.
    startY: els.triggerEl.offsetTop, // 애니메이션 시작 좌표(px)
    triggerYPercent: 50, // 트리거 y 축 좌표(%)
    showIndicator: false, // indicator 표시 유무
    duration: 100, // 애니메이션 스크롤 기간(px, progress only)
    smooth: 1, // 부드럽게 움직임 옵션 추가.(progress only: 0.01 ~ 1)
    once: false, // 한번만 애니메이션 함.(onComplete 이후 kill)
    onStart: undefined, // 애니메이션 start 시 이벤트
    onUpdate: undefined, // update 시 지속 이벤트
    onComplete: undefined, // 애니메이션 완료 시 이벤트
    onFixed: {status: 'ready'}, // fixedEl 시 상태 저장값. (ready, before, ing, completed)
    startIndicatorName: 'start',
    endIndicatorName: 'end',
    triggerIndicatorName: 'trigger',
    ..._options,
  };
  // _.log('> ', options.type)

  return {
    tl,
    els,
    ...options,
  };
});


/** ============================================================
 * @ 엘리먼트 셋팅
============================================================ */
const setElement = ({triggerEl, fixedEl}) => {
  const els = {}
  els.triggerEl = document.querySelector(triggerEl);

  // # 고정 엘리먼트.
  if(fixedEl) {
    els.fixedEl = document.querySelector(fixedEl); // fixed 엘리먼트 선택
    els.fixedWrapper = el(fixedElWrapperTemplate({height: els.fixedEl.offsetHeight}));
    wrapEl(els.fixedEl, els.fixedWrapper);
  }

  return els;
}


/** ============================================================
 * @ indicator 생성
============================================================ */
const indicator = ({startY, duration, triggerYPercent, type,
  startIndicatorName, endIndicatorName, triggerIndicatorName}) => {
  // console.log('> indicator : ', endIndicatorName);
  // # 인디케이터 생성
  append(document.body,
    el(indicatorTemplate({startY, endY: duration, type, startIndicatorName, endIndicatorName})));

  // # 트리거 생성.
  append(document.body,
    el(triggerTemplate({triggerYPercent, triggerIndicatorName})));
};


/** ============================================================
 * @ 모든 이벤트를 언바인딩 시키고 작동을 멈춘다.
============================================================ */
const killAll = (data) => {
  for(const a of data) {
    kill(a);
  }
};

const kill = ({tl, scrollEventFunc}) => {
  window.removeEventListener('scroll', scrollEventFunc);
  tl.clear();
  tl.kill();
}


/** ============================================================
* @ 외부 노출 객체
* gsap scroll 애니메이션 객체
============================================================ */
const gsapc = {};

// ===== 타입별 메소드`
gsapc.progress = play('progress');
gsapc.trigger = play('trigger');


export default gsapc;