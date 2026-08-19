(function(){
  "use strict";
  var deck=document.getElementById("deck");
  var slides=[].slice.call(deck.querySelectorAll(".slide"));
  var counter=document.getElementById("counter");
  var progress=document.getElementById("progressBar");
  var notesPanel=document.getElementById("notesPanel");
  var menu=document.getElementById("slideMenu");
  var menuItems=document.getElementById("menuItems");
  var help=document.getElementById("help");
  var index=0;
  var touchStart=null;

  slides.forEach(function(slide,i){
    var section=slide.getAttribute("data-section")||"Lesson 01";
    var chrome=document.createElement("header");
    chrome.className="slide-chrome";
    chrome.innerHTML='<div class="brand"><span class="brand-mark">Q</span><span class="brand-copy">晴幂科技<small>QINGMI TECH</small></span></div><span class="section-label">'+section+'</span>';
    var foot=document.createElement("footer");
    foot.className="slide-foot";
    foot.innerHTML='<span>HUMAN AI FOR HAPPINESS</span><span class="page-no">'+String(i+1).padStart(2,"0")+'</span>';
    slide.insertBefore(chrome,slide.firstChild);
    slide.appendChild(foot);
  });

  function titleAt(i){return slides[i].getAttribute("data-title")||("第 "+(i+1)+" 页")}
  function buildMenu(){
    menuItems.innerHTML="";
    slides.forEach(function(slide,i){
      var button=document.createElement("button");
      button.type="button";
      button.innerHTML="<b>"+String(i+1).padStart(2,"0")+"</b><span>"+titleAt(i)+"</span>";
      button.addEventListener("click",function(){go(i);closeOverlays()});
      menuItems.appendChild(button);
    });
  }

  function go(next,updateHash){
    if(next<0)next=0;if(next>=slides.length)next=slides.length-1;
    index=next;
    slides.forEach(function(slide,i){
      slide.classList.toggle("is-active",i===index);
      slide.classList.toggle("is-before",i<index);
      slide.setAttribute("aria-hidden",i===index?"false":"true");
    });
    counter.textContent=String(index+1).padStart(2,"0")+" / "+String(slides.length).padStart(2,"0");
    progress.style.width=((index+1)/slides.length*100)+"%";
    var note=slides[index].querySelector("aside.notes");
    notesPanel.textContent=note?note.textContent.trim():"本页没有讲师备注。";
    [].slice.call(menuItems.querySelectorAll("button")).forEach(function(btn,i){btn.classList.toggle("active",i===index)});
    document.title=String(index+1).padStart(2,"0")+"｜"+titleAt(index)+"｜晴幂科技";
    if(updateHash!==false)history.replaceState(null,"","#slide="+(index+1));
  }

  function parseHash(){
    var match=location.hash.match(/slide=(\d+)/);
    return match?Math.max(0,Math.min(slides.length-1,Number(match[1])-1)):0;
  }
  function closeOverlays(){menu.classList.remove("is-open");help.classList.remove("is-open")}
  function toggleMenu(){menu.classList.toggle("is-open");help.classList.remove("is-open")}
  function toggleNotes(){notesPanel.classList.toggle("is-open")}
  function toggleHelp(){help.classList.toggle("is-open");menu.classList.remove("is-open")}
  function toggleFullscreen(){
    if(!document.fullscreenElement){(document.documentElement.requestFullscreen||function(){}).call(document.documentElement)}
    else if(document.exitFullscreen)document.exitFullscreen();
  }
  function isTyping(target){return target&&(/INPUT|TEXTAREA|SELECT/.test(target.tagName)||target.isContentEditable)}

  document.getElementById("prevBtn").addEventListener("click",function(){go(index-1)});
  document.getElementById("nextBtn").addEventListener("click",function(){go(index+1)});
  document.getElementById("menuBtn").addEventListener("click",toggleMenu);
  document.getElementById("notesBtn").addEventListener("click",toggleNotes);
  document.getElementById("fullBtn").addEventListener("click",toggleFullscreen);
  document.getElementById("helpBtn").addEventListener("click",toggleHelp);
  help.addEventListener("click",function(e){if(e.target===help)toggleHelp()});

  window.addEventListener("keydown",function(e){
    if(isTyping(e.target))return;
    if(e.key==="ArrowRight"||e.key==="PageDown"||e.key===" "){e.preventDefault();go(index+1)}
    else if(e.key==="ArrowLeft"||e.key==="PageUp"){e.preventDefault();go(index-1)}
    else if(e.key==="Home"){e.preventDefault();go(0)}
    else if(e.key==="End"){e.preventDefault();go(slides.length-1)}
    else if(e.key.toLowerCase()==="m")toggleMenu();
    else if(e.key.toLowerCase()==="n")toggleNotes();
    else if(e.key.toLowerCase()==="f")toggleFullscreen();
    else if(e.key==="?")toggleHelp();
    else if(e.key==="Escape"){closeOverlays();notesPanel.classList.remove("is-open")}
  });

  deck.addEventListener("touchstart",function(e){
    if(e.touches.length!==1||e.target.closest("video,.canvas-wrap,.assumption-scroll,.controls"))return;
    touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};
  },{passive:true});
  deck.addEventListener("touchend",function(e){
    if(!touchStart||!e.changedTouches.length)return;
    var dx=e.changedTouches[0].clientX-touchStart.x;
    var dy=e.changedTouches[0].clientY-touchStart.y;
    touchStart=null;
    if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.25)go(index+(dx<0?1:-1));
  },{passive:true});

  window.addEventListener("hashchange",function(){go(parseHash(),false)});
  buildMenu();
  go(parseHash(),false);
  window.qingmiDeck={go:go,next:function(){go(index+1)},prev:function(){go(index-1)},count:slides.length,current:function(){return index+1}};
})();
