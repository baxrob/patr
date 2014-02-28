function SoundToy(shaderCodeEditor)
{
    this.mCreated = false;
    this.mShaderCodeEditor = shaderCodeEditor;
    this.mShaderCodeTextArea = document.getElementById("myShaderCode");
    this.mAudioContext = null;
    this.mCanvasGraph = null;
    this.mCanvasPiano = null;

    this.mHttpReq = null;

    this.mSampleRate = 44100;
    this.mNumNotes = 32 + 12*2;
    this.mSamples = new Array(this.mNumNotes);
    this.mSLen = 1*this.mSampleRate;
    this.mBuffer = null;
    this.mOctave = 1;
    this.mVolume = 100;

    this.mCanvasGraph = document.getElementById("graph");
    this.mCanvasPiano = document.getElementById("piano");
    this.mHttpReq = new XMLHttpRequest();

                                     if( window.AudioContext )       this.mAudioContext = new AudioContext();
    if( this.mAudioContext==null ) { if( window.webkitAudioContext ) this.mAudioContext = new webkitAudioContext(); }
    if( this.mAudioContext==null )
    {
        var div = document.createElement("div");
        div.innerHTML = "This demo requires a WebAudio-enabled browser.";
        var canvasParent = this.mCanvasGraph.parentNode;
        canvasParent.replaceChild(div, this.mCanvasGraph);
        return;
    }

    //this.mSampleRate = this.mAudioContext.sampleRate;
    //this.mSLen = this.mSampleRate;

    this.mBuffer = new Array( 8 );
    this.mActiveNote = new Array( 8 );
    for( j=0; j<8; j++ )
    {
        //this.mBuffer[j] = this.mAudioContext.createBuffer( 1, this.mSLen, 44100 );
        this.mBuffer[j] = this.mAudioContext.createBuffer( 1, this.mSLen, this.mSampleRate );
        this.mActiveNote[j] = { mNote:666, mTo:0.0 };
    }

    for( j=0; j<this.mNumNotes; j++ )
    {
        this.mSamples[j] = new Float32Array(this.mSLen);
    }

    this.mId = 0;

    //--------------------

    this.mShaderCodeTextArea.value = "y = sin(w*t)*exp(-5*t);";
    this.newSound();

    //--------------------

    var me = this;

    me.AltIsDown = false;
    this.mShaderCodeTextArea.onkeyup = function(ev) { if( ev.keyCode==0x12 ) me.AltIsDown=false; }
    this.mShaderCodeTextArea.onkeydown = function(ev)
    {
        if( ev.keyCode==0x12 ) me.AltIsDown=true;
        if( ev.keyCode==0x0d && me.AltIsDown )
        {
             me.newSound();
        }
    }

    this.drawPiano();

    this.mCreated = true;
}

SoundToy.prototype.newSound = function()
{
    var formula;
    if( this.mShaderCodeEditor==null )
        formula = this.mShaderCodeTextArea.value;
    else
        formula = this.mShaderCodeEditor.getCode();

    var message = "Compiled correctly";
    try
    {

      var f2 = new String(formula);
//      f2 = f2.replace( /atan2/gi, "Math.atan2" );
//      f2 = f2.replace( /atan/gi, "Math.atan" );
      f2 = f2.replace( /sin/gi, "Math.sin" );
      f2 = f2.replace( /cos/gi, "Math.cos" );
      f2 = f2.replace( /tan/gi, "Math.tan" );
      f2 = f2.replace( /asin/gi, "Math.asin" );
      f2 = f2.replace( /acos/gi, "Math.acos" );
      f2 = f2.replace( /exp/gi, "Math.exp" );
      f2 = f2.replace( /pow/gi, "Math.pow" );
      f2 = f2.replace( /sqrt/gi, "Math.sqrt" );
      f2 = f2.replace( /log/gi, "Math.log" );
      f2 = f2.replace( /abs/gi, "Math.abs" );
      f2 = f2.replace( /min/gi, "Math.min" );
      f2 = f2.replace( /max/gi, "Math.max" );
      f2 = f2.replace( /round/gi, "Math.round" );
      f2 = f2.replace( /floor/gi, "Math.floor" );
      f2 = f2.replace( /ceil/gi, "Math.ceil" );
      f2 = f2.replace( /random/gi, "Math.random" );

      var func = new Function( "w", "num", "buf", "var isr = 1.0/44100.0; for( i=0; i<num; i++ ) { var t = i*isr; var y=0.0; " + f2 + "; buf[i] = y; }" );






      var me = 0;
      var sid = 0;
      var bar = document.getElementById("myProgressBar");
      function calcSample()
      {
          if( sid >= me.mNumNotes ) return;
  
          bar.value = Math.floor(100.0*sid/(me.mNumNotes-1));
  
          var f = 440.0*Math.pow( 2.0, (sid-9-12)/12.0 );
          var w = 2.0*Math.PI*f;
          func(w,me.mSLen,me.mSamples[sid]);
  
          sid = sid + 1;
  
          setTimeout( calcSample, 2 );
      }
      me = this;
      sid = 0;
      calcSample();

/*
      var bar = document.getElementById("myProgressBar");
      bar.value = 0;
      for( var j=0; j<this.mNumNotes; j++ )
      {
          bar.value = Math.floor(100.0*j/(this.mNumNotes-1));
          var f = 440.0*Math.pow( 2.0, (j-9-12)/12.0 );
          var w = 2.0*Math.PI*f;
          func(w,this.mSLen,this.mSamples[j]);
      }
*/

      this.drawGraph();
    }
    catch( e )
    {
      message = e;
    }
    var errorTxtBox = document.getElementById("errorTxtBox");
    errorTxtBox.value = message;

    this.mForceFrame = true;
}

SoundToy.prototype.drawGraph = function()
{
    var ctx = this.mCanvasGraph.getContext('2d');

    var xres = this.mCanvasGraph.width;
    var yres = this.mCanvasGraph.height;

    ctx.fillStyle = '#202020';
    ctx.fillRect(0, 0, xres, yres);

    ctx.strokeStyle = '#ffc040';
    ctx.lineWidth = 1.5;

    ctx.beginPath();

    for( var i = 0; i <this.mSLen; i++ )
    {
        var x = xres*i/this.mSLen;
        var y = this.mSamples[0][i];

        var j = yres*(0.5+0.5*y);

        ctx.lineTo(x, j);
    }

    ctx.stroke();
    ctx.closePath();

}

SoundToy.prototype.noteOn = function( note )
{
    var id = this.mId;

    note += this.mOctave*12;

    this.mId = (this.mId+1) % 8;

    // copy data
    var dbuf = this.mBuffer[id].getChannelData(0);
    var num = this.mSLen;
    var sbuf = this.mSamples[note];
    for( i=0; i<num; i++ )
    {
        dbuf[i] = sbuf[i];
    }

    var node = this.mAudioContext.createBufferSource();
    node.buffer = this.mBuffer[id];
    node.gain.value = 0.5 * this.mVolume/100.0;
    node.connect(this.mAudioContext.destination);
    console.log(node);
    node.noteOn(0);

    this.mActiveNote[id].mNote = note;
    this.mActiveNote[id].mTo = new Date().getTime();
}

function fmod(x,y)
{
    return x%y;
}

function sign(x)
{
    if( x>0.0 ) x=1.0; else x=-1.0;
    return x;
}
function smoothstep(a,b,x)
{
    if( x<a ) return 0.0;
    if( x>b ) return 1.0;
    var y = (x-a)/(b-a);
    return y*y*(3.0-2.0*y);
}
function clamp(x,a,b)
{
    if( x<a ) return a;
    if( x>b ) return b;
    return x;
}
function step(a,x)
{
    if( x<a ) return 0.0;
    else      return 1.0;
}
function mix(a,b,x)
{
    return a + (b-a)*Math.min(Math.max(x,0.0),1.0);
}
function over(x,y)
{
    return 1.0 - (1.0-x)*(1.0-y);
}
function tri(a,x)
{
    x = x / (2.0*Math.PI);
    x = x % 1.0;
    if( x<0.0 ) x = 1.0+x;
    if(x<a) x=x/a; else x=1.0-(x-a)/(1.0-a);
    return -1.0+2.0*x;
}

function saw(x,a)
{
    var f = x % 1.0;

    if( f<a )
        f = f/a;
    else
        f = 1.0 - (f-a)/(1.0-a);
    return f;
}

function sqr(a,x)
{
    if( Math.sin(x)>a ) x=1.0; else x=-1.0;
    return x;
}
function grad(n, x)
{
    n = (n << 13) ^ n;
    n = (n * (n * n * 15731 + 789221) + 1376312589);
    var res = x;
    if( n & 0x20000000 ) res = -x;
    return res;
}

function noise(x)
{
    var i = Math.floor(x);
    var f = x - i;
    var w = f*f*f*(f*(f*6.0-15.0)+10.0);
    var a = grad( i+0, f+0.0 );
    var b = grad( i+1, f-1.0 );
    return a + (b-a)*w;
}

function cellnoise(x)
{
    var n = Math.floor(x);
    n = (n << 13) ^ n;
    n = (n * (n * n * 15731 + 789221) + 1376312589);
    n = (n>>14) & 65535;
    return n/65535.0;
}
function frac(x)
{
//    return x - Math.floor(x);
    return x % 1.0;
}

SoundToy.prototype.stn = function( n )
{
    var o = Math.floor(n/12);
    n = n % 12;

    if( n>4 ) n+=1;
    return 7*o + (n/2);
}

SoundToy.prototype.drawPiano = function()
{

    function renderLoop2(me)
    {
      var ctx = me.mCanvasPiano.getContext('2d');

      var xres = me.mCanvasPiano.width;
      var yres = me.mCanvasPiano.height;

      var num = 8*me.mNumNotes/12 - 5;
      var dx = xres/num;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, xres, yres);

      var needsAnim = false;
      //------------
      var time = (new Date()).getTime();

      for( var i=0; i<8; i++ )
      {
          var note = me.mActiveNote[i].mNote;
          if( note==666 ) continue;

          var dt = time - me.mActiveNote[i].mTo;
          if( dt>1000 ) { me.mActiveNote[i].mNote=666; continue; }
          needsAnim = true;
          var e = Math.exp(-3.0*dt/1000.0);
          var cr = Math.floor(0.8*255.0*e + (1.0-e)*255.0 );
          var cg = Math.floor(0.8*192.0*e + (1.0-e)*255.0 );
          var cb = Math.floor(0.8* 64.0*e + (1.0-e)*255.0 );
          var str = 'rgb(' + cr + ',' + cg + ',' + cb + ')';
          ctx.fillStyle = str;

          var n = note % 12;
          if( (n==1) || (n==3) || (n==6) || (n==8) || (n==10) ) continue;

          var y = me.stn(note);

          var x = y*dx;

          ctx.fillRect(x, 0, dx, yres );
      }


      //------------
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      for( var i=0; i<num; i++ )
      {
          var x = dx*i;

          ctx.moveTo(x, 0);
          ctx.lineTo(x, yres);

      }
      ctx.stroke();


      ctx.fillStyle = '#000000';
      for( var i=0; i<num; i++ )
      {
          var n = i % 7;
          if( (n==2) || (n==6) ) continue;
          var x = i*dx + dx*0.7;
          ctx.fillRect(x, 0, dx*0.6, yres*0.6 );
      }

      var str = "zxcvbnmqwertyuiop";

      for( var i=0; i<17; i++ )
           ctx.fillText( str[i], 14 + (i+me.mOctave*7)*dx, yres-10 );

      for( var i=0; i<8; i++ )
      {
          var note = me.mActiveNote[i].mNote;
          if( note==666 ) continue;

          var dt = time - me.mActiveNote[i].mTo;
          if( dt>1000 ) { me.mActiveNote[i].mNote=666; continue; }
          needsAnim = true;
          var e = Math.exp(-3.0*dt/1000.0);
          var cr = Math.floor(0.8*255.0*e + (1.0-e)*0.0 );
          var cg = Math.floor(0.8*192.0*e + (1.0-e)*0.0 );
          var cb = Math.floor(0.8* 64.0*e + (1.0-e)*0.0 );
          var str = 'rgb(' + cr + ',' + cg + ',' + cb + ')';
          ctx.fillStyle = str;

          var n = note % 12;
          if( (n==0) || (n==2) || (n==4) || (n==5) || (n==7) || (n==9) || (n==11) ) continue;

          var y = me.stn(note);
          var x = y*dx + dx*0.7 - dx*0.5;
          ctx.fillRect(x, 0, dx*0.6, yres*0.6 );
      }

      var tin = 100;
      if( needsAnim ) tin = 15;
      setTimeout( renderLoop2, tin, me );
    }

    setTimeout(renderLoop2, 0, this );
}

SoundToy.prototype.newScript = function(url)
{
    var formula = null;
    var comments = null;

    this.mHttpReq.open("GET", url, false);
    try
    {
        this.mHttpReq.send(null);
    }
    catch(e)
    {
        alert( "could not load script " + url + ": " + e );
        return false;
    }
    var xml = this.mHttpReq.responseXML;
    if( xml==null )
    {
        alert( "could not load script" );
        return false;
    }

    var ele_shadertoy = xml.getElementsByTagName("soundtoy");
    if( ele_shadertoy.length != 1 )
    {
        alert( "could not load script" );
        return false;
    }
    var version = ele_shadertoy[0].attributes["version"].value;
    if( version != "0.1" )
    {
        alert( "could not load script" );
        return false;
    }

    var ele_options = xml.getElementsByTagName("options");
    if( ele_options.length != 1 )
    {
        alert( "could not load script" );
        return false;
    }
    var effects = ele_options[0].attributes["applyeffects"].value;
    var ele_shader = ele_shadertoy[0].getElementsByTagName("code");
    var ele_info = ele_shadertoy[0].getElementsByTagName("info");
    if( ele_info.length != 1 )
    {
        alert( "could not load script" );
        return false;
    }
    var infoName = ele_info[0].attributes["name"].value;
    var infoAuthor = ele_info[0].attributes["author"].value;
    var infoYear = ele_info[0].attributes["date"].value;
    var infoLink = ele_info[0].attributes["link"].value;

    var ele_comments = ele_info[0].getElementsByTagName("comments");
    comments = ele_comments[0].firstChild.data;

    //------------------------

    document.getElementById("myInfo").innerHTML = "'" + infoName + "' by " + infoAuthor + " (" + infoYear + ")";
    document.getElementById("myInfo").href = infoLink;
    document.getElementById("myComments").value = comments;

    //------------------------
    this.mShaderCodeTextArea.value = ele_shader[0].childNodes[0].nodeValue
    this.newSound();


/*
    this.mHttpReq.open("GET", url, true);
 //   this.mHttpReq.responseType = "arraybuffer";

    var me = this;
    this.mHttpReq.onload = function()
    {

      var xml = me.mHttpReq.responseXML;
      //var xml = me.mHttpReq.responseText;
      if( xml==null )
      {
          alert( "could not load script" );
          return false;
      }
      var ele_shadertoy = xml.getElementsByTagName("soundtoy");
      if( ele_shadertoy.length != 1 )
      {
          alert( "could not load script" );
          return false;
      }
      var version = ele_shadertoy[0].attributes["version"].value;
      if( version != "0.1" )
      {
          alert( "could not load script" );
          return false;
      }
      var ele_options = xml.getElementsByTagName("options");
      if( ele_options.length != 1 )
      {
          alert( "could not load script" );
          return false;
      }
      var effects = ele_options[0].attributes["applyeffects"].value;
      var ele_shader = ele_shadertoy[0].getElementsByTagName("code");
      var ele_info = ele_shadertoy[0].getElementsByTagName("info");
      if( ele_info.length != 1 )
      {
          alert( "could not load script" );
          return false;
      }
      var infoName = ele_info[0].attributes["name"].value;
      var infoAuthor = ele_info[0].attributes["author"].value;
      var infoYear = ele_info[0].attributes["date"].value;
      var infoLink = ele_info[0].attributes["link"].value;

      var ele_comments = ele_info[0].getElementsByTagName("comments");
      comments = ele_comments[0].firstChild.data;

      //------------------------

      document.getElementById("myInfo").innerHTML = "'" + infoName + "' by " + infoAuthor + " (" + infoYear + ")";
      document.getElementById("myInfo").href = infoLink;
      document.getElementById("myComments").value = comments;

      //------------------------
      me.mShaderCodeTextArea.value = ele_shader[0].childNodes[0].nodeValue
      me.newSound();

    }

    try
    {
        this.mHttpReq.send();
    }
    catch(e)
    {
        alert( "could not load script " + url + ": " + e );
        return false;
    }
*/


    return true;
}

SoundToy.prototype.setOctave = function(o)
{
    this.mOctave = o;
}

SoundToy.prototype.setVolume = function()
{
    var v = document.getElementById("myVolume").value;
    if( v<  0 ) { v=  0; document.getElementById("myVolume").value =   0; }
    if( v>100 ) { v=100; document.getElementById("myVolume").value = 100; }
    this.mVolume = v;
}
