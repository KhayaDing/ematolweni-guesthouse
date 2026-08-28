const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('js/script.js','utf8');
const feature=source.slice(source.indexOf('// Carousel Implementation'),source.indexOf('function getGalleryScrollOffset'));
function setup({reduce=false,saveData=false}={}) {
  const timers=new Map(), listeners={}, observers=[];
  let timerId=0;
  function element(){return {dataset:{},hidden:false,classList:{active:false,toggle(k,v){this[k]=v;}},setAttribute(k,v){this[k]=v;},addEventListener(k,v){this[k]=v;}};}
  const slides=Array.from({length:3},(_,i)=>{
    const img={dataset:i?{src:`slide${i}.jpg`,srcset:`slide${i}.jpg 100w`}:{},src:i?'':'slide0.jpg',naturalWidth:100,decode:()=>Promise.resolve()};
    const source={dataset:i?{srcset:`slide${i}.webp 100w`}:{}};
    return {...element(),img,source,querySelector:()=>img,querySelectorAll:()=>source.dataset.srcset?[source]:[]};
  });
  const video={...element(),dataset:{src:'tour.mp4'},src:'',controls:true,paused:true,load(){this.loaded=true;},focus(){},pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}};
  const play=element();
  const context=vm.createContext({console,Promise,WeakMap,clearTimeout:id=>timers.delete(id),setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},navigator:{connection:{saveData,addEventListener(){}}},window:{matchMedia:()=>({matches:reduce,addEventListener(){}}),IntersectionObserver:true},IntersectionObserver:class{constructor(fn){observers.push(fn);}observe(){}},document:{hidden:false,querySelectorAll:s=>s==='.hero-slide'?slides:[],querySelector:()=>null,getElementById:id=>id==='about-video'?video:play,addEventListener:(name,fn)=>listeners[name]=fn}});
  vm.runInContext(feature,context);
  return {context,slides,video,play,timers,observers,listeners};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  const normal=setup(); await flush();
  assert.equal(normal.slides[0].classList.active,true);
  assert.equal(normal.slides[1].img.src,'','inactive hero is not requested initially');
  assert.deepEqual([...normal.timers.values()].map(t=>t.ms),[5500,7000]);
  normal.observers[0]([{isIntersecting:true}]);await flush();
  assert.equal(normal.video.src,'tour.mp4','visible video URL is assigned');
  assert.equal(normal.video.paused,false,'visible muted video autoplays');
  normal.observers[0]([{isIntersecting:false}]);
  assert.equal(normal.video.paused,true,'off-screen video pauses');
  let finish;
  normal.slides[1].img.decode=()=>new Promise(resolve=>finish=resolve);
  const switching=vm.runInContext('setActiveSlide(1)',normal.context);
  assert.equal(normal.slides[0].classList.active,true,'current slide stays until decode');
  finish();await switching;
  assert.equal(normal.slides[1].classList.active,true);
  assert.equal(normal.slides[1].source.srcset,'slide1.webp 100w');
  normal.slides[2].img.decode=()=>Promise.reject(new Error('network failure'));
  await vm.runInContext('setActiveSlide(2)',normal.context);
  assert.equal(normal.slides[1].classList.active,true,'failed image never replaces visible slide');
  const race=setup();await flush();
  let release;
  race.slides[1].img.decode=()=>new Promise(resolve=>release=resolve);
  const oldRequest=vm.runInContext('setActiveSlide(1)',race.context);
  await vm.runInContext('setActiveSlide(2)',race.context);
  release();await oldRequest;
  assert.equal(race.slides[2].classList.active,true,'latest manual request wins');
  const automatic=setup();await flush();
  await [...automatic.timers.values()].find(t=>t.ms===7000).fn();
  assert.equal(automatic.slides[1].classList.active,true,'automatic navigation waits for decode');
  for(const preferences of [{reduce:true},{saveData:true}]) {
    const test=setup(preferences);await flush();
    assert.equal(test.timers.size,0,'automatic carousel and preloads disabled');
    assert.equal(test.video.src,'','video URL not assigned before interaction');
    assert.equal(test.video.paused,true);
    await test.play.click();
    assert.equal(test.video.src,'tour.mp4');
    assert.equal(test.video.paused,false,'explicit playback still works');
    test.observers[0]([{isIntersecting:false}]);
    assert.equal(test.video.paused,true,'off-screen video pauses');
    await vm.runInContext('setActiveSlide(2)',test.context);
    assert.equal(test.slides[2].classList.active,true,'manual carousel works with preferences');
  }
  console.log('PASS: initial/deferred slides, decode gating, failure handling, visible video autoplay, preference fallbacks and off-screen pause.');
})().catch(e=>{console.error(e);process.exitCode=1;});
