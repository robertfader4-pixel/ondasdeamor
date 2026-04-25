(function(){
  const modal=document.getElementById('soundModal'),
        card=document.getElementById('soundModalCard'),
        drag=document.getElementById('soundModalDrag'),
        openBtn=document.getElementById('openSoundBtn'),
        closeBtn=document.getElementById('closeSoundBtn'),
        audio=document.getElementById('soundtrack'),
        canvas=document.getElementById('spectrumCanvas'),
        ray=document.getElementById('globalSpectrumCanvas'),
        items=[...document.querySelectorAll('.playlist-item')],
        KEY='waves_love_player_v8';

  if(!modal||!card||!drag||!openBtn||!closeBtn||!audio||!canvas||!items.length)return;

  let ac,an,src,raf,down=false,ox=0,oy=0;

  const norm=s=>(s||'').split('/').pop().toLowerCase();
  const active=()=>items.find(i=>i.classList.contains('active'))||items[0];

  function state(){
    try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}
  }

  function save(x={}){
    const b=active();
    try{
      localStorage.setItem(KEY,JSON.stringify(Object.assign({
        track:norm(b&&b.dataset.src),
        time:isFinite(audio.currentTime)?audio.currentTime:0,
        playing:!audio.paused,
        open:modal.classList.contains('active'),
        minimized:modal.classList.contains('minimized'),
        left:card.style.left||'',
        top:card.style.top||'',
        right:card.style.right||'',
        bottom:card.style.bottom||''
      },x)));
    }catch(e){}
  }

  function choose(b){
    items.forEach(i=>i.classList.toggle('active',i===b));
    updateMiniTitle();
  }

  function updateMiniTitle(){
    const t=card.querySelector('.sound-mini-track');
    const b=active();
    if(t&&b)t.textContent=(b.textContent||'Музыка').trim();
  }

  function setTrack(b,t=0,play=false){
    if(!b)return;
    choose(b);
    audio.innerHTML='';
    let s=document.createElement('source');
    s.src=b.dataset.src;
    s.type='audio/mpeg';
    audio.appendChild(s);
    if(b.dataset.fallback){
      let f=document.createElement('source');
      f.src=b.dataset.fallback;
      f.type='audio/wav';
      audio.appendChild(f);
    }
    audio.load();
    if(t>0)audio.addEventListener('loadedmetadata',function r(){
      try{audio.currentTime=Math.max(0,Math.min(t,audio.duration||t))}catch(e){}
      audio.removeEventListener('loadedmetadata',r);
    });
    if(play)audio.addEventListener('canplay',function p(){
      audio.play().catch(()=>{});
      audio.removeEventListener('canplay',p);
    });
    save({track:norm(b.dataset.src),time:t,playing:play});
  }

  function ensureButtons(){
    let min=card.querySelector('#minimizeSoundBtn');
    if(!min){
      min=document.createElement('button');
      min.id='minimizeSoundBtn';
      min.className='sound-minimize';
      min.type='button';
      min.setAttribute('aria-label','Свернуть список');
      min.innerHTML='—';
      closeBtn.parentNode.insertBefore(min,closeBtn);
      min.addEventListener('click',e=>{e.stopPropagation();minimize();});
    }
    let mini=card.querySelector('.sound-mini-track');
    if(!mini){
      mini=document.createElement('button');
      mini.className='sound-mini-track';
      mini.type='button';
      mini.setAttribute('aria-label','Развернуть список воспроизведения');
      mini.textContent='Музыка';
      drag.appendChild(mini);
      mini.addEventListener('click',e=>{e.stopPropagation();maximize();});
    }
    updateMiniTitle();
  }

  function graph(){
    if(an)return;
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C)return;
    ac=new C();
    an=ac.createAnalyser();
    an.fftSize=256;
    an.smoothingTimeConstant=.78;
    src=ac.createMediaElementSource(audio);
    src.connect(an);
    an.connect(ac.destination);
  }

  function resize(c){
    const d=Math.max(devicePixelRatio||1,1),r=c.getBoundingClientRect();
    c.width=Math.max(10,Math.floor(r.width*d));
    c.height=Math.max(10,Math.floor(r.height*d));
  }

  function draw(c,kind){
    if(!c)return;
    const ctx=c.getContext('2d');
    resize(c);
    const w=c.width,h=c.height;
    ctx.clearRect(0,0,w,h);
    let data=null;
    if(an&&!audio.paused){
      data=new Uint8Array(an.frequencyBinCount);
      an.getByteFrequencyData(data);
    }
    if(kind==='ray'){
      let cy=h*.5,gr=ctx.createLinearGradient(0,0,w,0);
      gr.addColorStop(0,'rgba(255,116,28,0)');
      gr.addColorStop(.18,'rgba(255,132,35,.55)');
      gr.addColorStop(.5,'rgba(255,230,145,.95)');
      gr.addColorStop(.82,'rgba(255,132,35,.55)');
      gr.addColorStop(1,'rgba(255,116,28,0)');
      ctx.strokeStyle=gr;
      ctx.lineWidth=Math.max(2,h*.05);
      ctx.shadowColor='rgba(255,120,28,.95)';
      ctx.shadowBlur=h*.28;
      ctx.beginPath();
      ctx.moveTo(0,cy);
      for(let i=0;i<=90;i++){
        let x=w*i/90,
            v=data?data[Math.floor((data.length-1)*i/90)]/255:(Math.sin(Date.now()/220+i)*.5+.5),
            amp=(.12+v*.88)*h*.38,
            y=cy+Math.sin(Date.now()/140+i*.75)*amp;
        ctx.lineTo(x,y);
      }
      ctx.stroke();
      ctx.shadowBlur=0;
      for(let i=0;i<70;i++){
        let v=data?data[Math.floor((data.length-1)*i/70)]/255:(Math.sin(Date.now()/300+i)*.5+.5),
            x=w*i/70,
            bar=Math.max(2,v*h*.78),
            g=ctx.createLinearGradient(0,cy-bar,0,cy+bar);
        g.addColorStop(0,'rgba(255,238,176,.05)');
        g.addColorStop(.5,'rgba(255,172,50,.95)');
        g.addColorStop(1,'rgba(255,85,22,.05)');
        ctx.fillStyle=g;
        ctx.fillRect(x,cy-bar/2,Math.max(2,w/170),bar);
      }
      return;
    }
    let bg=ctx.createLinearGradient(0,0,0,h);
    bg.addColorStop(0,'rgba(255,171,66,.18)');
    bg.addColorStop(1,'rgba(25,10,6,.05)');
    ctx.fillStyle=bg;
    ctx.fillRect(0,0,w,h);
    let bins=data||Array.from({length:64},(_,i)=>(Math.sin(Date.now()/400+i)*.5+.55)*180),bw=w/bins.length;
    bins.forEach((n,i)=>{
      let v=n/255,bh=Math.max(5,v*h*.92),g=ctx.createLinearGradient(0,h-bh,0,h);
      g.addColorStop(0,'rgba(255,238,181,.98)');
      g.addColorStop(.45,'rgba(255,146,38,.92)');
      g.addColorStop(1,'rgba(120,36,12,.75)');
      ctx.fillStyle=g;
      ctx.fillRect(i*bw,h-bh,Math.max(2,bw-1),bh);
    });
  }

  function loop(){
    draw(canvas,'panel');
    if(ray&&!audio.paused)draw(ray,'ray');
    raf=requestAnimationFrame(loop);
  }

  function start(){
    if(raf)cancelAnimationFrame(raf);
    raf=requestAnimationFrame(loop);
  }

  async function play(){
    try{
      graph();
      if(ac&&ac.state==='suspended')await ac.resume();
      await audio.play();
      ray&&ray.classList.add('is-playing');
      save({playing:true});
      start();
    }catch(e){save({playing:false})}
  }

  function open(){
    modal.classList.add('active');
    modal.setAttribute('aria-hidden','false');
    save({open:true});
    start();
  }

  function close(){
    modal.classList.remove('active','minimized');
    modal.setAttribute('aria-hidden','true');
    audio.pause();
    ray&&ray.classList.remove('is-playing');
    save({open:false,minimized:false,playing:false,time:audio.currentTime||0});
  }

  function minimize(){
    modal.classList.add('minimized');
    modal.setAttribute('aria-hidden','false');
    save({open:true,minimized:true,playing:!audio.paused});
  }

  function maximize(){
    modal.classList.remove('minimized');
    open();
    save({open:true,minimized:false});
  }

  ensureButtons();

  openBtn.addEventListener('click',()=>{
    if(modal.classList.contains('active')&&modal.classList.contains('minimized')){
      maximize();
    }else{
      open();
    }
    if(audio.paused)play();
  });

  closeBtn.addEventListener('click',close);
  items.forEach(b=>b.addEventListener('click',()=>{setTrack(b,0,true);play();}));

  drag.addEventListener('pointerdown',e=>{
    if(e.target.closest('button'))return;
    down=true;
    card.setPointerCapture(e.pointerId);
    let r=card.getBoundingClientRect();
    ox=e.clientX-r.left;
    oy=e.clientY-r.top;
    card.style.right='auto';
    card.style.bottom='auto';
  });
  drag.addEventListener('pointermove',e=>{
    if(!down)return;
    let l=Math.min(Math.max(0,innerWidth-card.offsetWidth),Math.max(0,e.clientX-ox)),
        t=Math.min(Math.max(0,innerHeight-card.offsetHeight),Math.max(0,e.clientY-oy));
    card.style.left=l+'px';
    card.style.top=t+'px';
    save({left:card.style.left,top:card.style.top,right:'auto',bottom:'auto'});
  });
  function up(e){
    down=false;
    try{card.releasePointerCapture(e.pointerId)}catch(x){}
  }
  drag.addEventListener('pointerup',up);
  drag.addEventListener('pointercancel',up);

  audio.addEventListener('timeupdate',()=>save());
  audio.addEventListener('pause',()=>{ray&&ray.classList.remove('is-playing');save({playing:false})});
  audio.addEventListener('play',()=>{ray&&ray.classList.add('is-playing');save({playing:true});start()});
  addEventListener('resize',start);
  addEventListener('beforeunload',()=>save());

  let st=state(),b=items[0];
  if(st&&st.track)b=items.find(i=>norm(i.dataset.src)===st.track)||b;
  setTrack(b,st&&st.time?st.time:0,false);

  if(st){
    if(st.left)card.style.left=st.left;
    if(st.top)card.style.top=st.top;
    if(st.right)card.style.right=st.right;
    if(st.bottom)card.style.bottom=st.bottom;
    if(st.open)open();
    if(st.minimized)minimize();
    if(st.playing)play();
  }
})();
