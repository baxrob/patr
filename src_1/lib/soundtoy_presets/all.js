//(function() {
var sin = Math.sin;
/*

<?xml version="1.0" encoding="ISO-8859-1"?>
<soundtoy version="0.1">
    <info name="Bell" date="2004" author="iq" link="http://www.iquilezles.org">
    <comments>a bell made from inharmonic tones (numbers taken from a book which name i can't recall)</comments>
    </info>
    <options applyeffects="yes"/>
    <code>
*/

var bell = function() {
    y = 0.100*exp( -t/1.000 )*sin( 0.56*w*t );
    y += 0.067*exp( -t/0.900 )*sin( 0.56*w*t );
    y += 0.100*exp( -t/0.650 )*sin( 0.92*w*t );
    y += 0.180*exp( -t/0.550 )*sin( 0.92*w*t );
    y += 0.267*exp( -t/0.325 )*sin( 1.19*w*t );
    y += 0.167*exp( -t/0.350 )*sin( 1.70*w*t );
    y += 0.146*exp( -t/0.250 )*sin( 2.00*w*t );
    y += 0.133*exp( -t/0.200 )*sin( 2.74*w*t );
    y += 0.133*exp( -t/0.150 )*sin( 3.00*w*t );
    y += 0.100*exp( -t/0.100 )*sin( 3.76*w*t );
    y += 0.133*exp( -t/0.075 )*sin( 4.07*w*t );
}

/*
</code>
</soundtoy>


<?xml version="1.0" encoding="ISO-8859-1"?>
<soundtoy version="0.1">
    <info name="Drum 1" date="2006" author="iq" link="http://www.iquilezles.org">
    <comments>a simple drum sound</comments>
    </info>
    <options applyeffects="yes"/>
    <code>
*/

var drum1 = function() {
    y = max(-1.0,min(1.0,8.0*sin(3000*t*exp(-6*t))));
}

/*
</code>
</soundtoy>

<?xml version="1.0" encoding="ISO-8859-1"?>
<soundtoy version="0.1">
    <info name="Drum 2" date="2006" author="iq" link="http://www.iquilezles.org">
    <comments>a drum</comments>
    </info>
    <options applyeffects="yes"/>
    <code>
*/

var drum2 = function() {
    y = 0.5*noise(32000*t)*exp(-32*t);
    y += 2.0*noise(3200*t)*exp(-32*t);
    y += 3.0*cos(400*(1-t)*t)*exp(-4*t);
}

/*
</code>
</soundtoy>

<?xml version="1.0" encoding="ISO-8859-1"?>
<soundtoy version="0.1">
    <info name="Drum 3" date="2006" author="iq" link="http://www.iquilezles.org">
    <comments>an drum</comments>
    </info>
    <options applyeffects="yes"/>
    <code>
*/

var drum3 = function() {
    f = 1000-2500*t;
    y = sin(f*t);
    y += .2*random();
    y *= exp(-12*t);
    y *= 8;
}

/*
</code>
</soundtoy>

<?xml version="1.0" encoding="ISO-8859-1"?>
<soundtoy version="0.1">
    <info name="Flute 1" date="2006" author="iq" link="http://www.iquilezles.org">
    <comments>a simple flute-like sound</comments>
    </info>
    <options applyeffects="yes"/>
    <code>
*/

var flute1 = function() {
    y = 6.0*t*exp( -2*t )*sin( w*t );
    y *= .8+.2*cos(16*t);
}

/*
</code>
</soundtoy>

<?xml version="1.0" encoding="ISO-8859-1"?>
<soundtoy version="0.1">
    <info name="Guitar" date="2006" author="iq" link="http://www.iquilezles.org">
    <comments>a simple "guitar"</comments>
    </info>
    <options applyeffects="yes"/>
    <code>
*/

var guitar = function() {
    f = cos(0.251*w*t);
    y = 0.5*cos(1.0*w*t+3.14*f)*exp(-0.0007*w*t);
    y += 0.2*cos(2.0*w*t+3.14*f)*exp(-0.0009*w*t);
    y += 0.2*cos(4.0*w*t+3.14*f)*exp(-0.0016*w*t);
    y += 0.1*cos(8.0*w*t+3.14*f)*exp(-0.0020*w*t);
    y *= 0.9 + 0.1*cos(70.0*t);
    y = 2.0*y*exp(-22.0*t) + y;
}

/*
</code>
</soundtoy>

<?xml version="1.0" encoding="ISO-8859-1"?>
<soundtoy version="0.1">
    <info name="Organ 1" date="2006" author="iq" link="http://www.iquilezles.org">
    <comments>an organ</comments>
    </info>
    <options applyeffects="yes"/>
    <code>
*/

var organ1 = function() {
    y = .6*cos(w*t)*exp(-4*t);
    y += .4*cos(2*w*t)*exp(-3*t);
    y += .01*cos(4*w*t)*exp(-1*t);
    y = y*y*y + y*y*y*y*y + y*y;
    a = .5+.5*cos(8*t); y = sin(y*a*3.14);
    y *= 30*t*exp(-.1*t);
}

/*
</code>
</soundtoy>

<?xml version="1.0" encoding="ISO-8859-1"?>
<soundtoy version="0.1">
    <info name="Organ 2" date="2006" author="iq" link="http://www.iquilezles.org">
    <comments>an organ</comments>
    </info>
    <options applyeffects="yes"/>
    <code>
*/

var organ2 = function() {
    f = fmod(t,6.2831/w)*w/6.2831;
    a = .7+.3*cos(6.2831*t);
    y = -1.0+2*saw(f,a);
    y = y*y*y;
    y = 15*y*t*exp(-5*t);
}

/*
</code>
</soundtoy>

<?xml version="1.0" encoding="ISO-8859-1"?>
<soundtoy version="0.1">
    <info name="Organ 3" date="2006" author="iq" link="http://www.iquilezles.org">
    <comments>an organ</comments>
    </info>
    <options applyeffects="yes"/>
    <code>
*/

var organ3 = function() {
    a1 = .5+.5*cos(0+t*12);
    a2 = .5+.5*cos(1+t*8);
    a3 = .5+.5*cos(2+t*4);
    y = saw(.2500*w*t,a1)*exp(-2*t);
    y += saw(.1250*w*t,a2)*exp(-3*t);
    y += saw(.0625*w*t,a3)*exp(-4*t);
    y *= .8+.2*cos(64*t);
}

/*
</code>
</soundtoy>

<?xml version="1.0" encoding="ISO-8859-1"?>
<soundtoy version="0.1">
    <info name="Organ 4" date="2006" author="iq" link="http://www.iquilezles.org">
    <comments>an organ</comments>
    </info>
    <options applyeffects="yes"/>
    <code>
*/

var organ4 = function() {
    var f = 0.001*(cos(5*t));
    y = 1.0*(saw((1.00+f)*0.1*w*t,1)-0.5);
    y += 0.7*(saw((2.01+f)*0.1*w*t,1)-0.5);
    y += 0.5*(saw((4.02+f)*0.1*w*t,1)-0.5);
    y += 0.2*(saw((8.02+f)*0.1*w*t,1)-0.5);
    y *= 20*t*exp(-4*t);
    y *= 0.9+0.1*cos(40*t);
}

/*
</code>
</soundtoy>

<?xml version="1.0" encoding="ISO-8859-1"?>
<soundtoy version="0.1">
    <info name="Piano" date="2006" author="iq" link="http://www.iquilezles.org">
    <comments>a simple "piano"</comments>
    </info>
    <options applyeffects="yes"/>
    <code>
*/

var piano1 = function() {
    y = 0.6*sin(1.0*w*t)*exp(-0.0008*w*t);
    y += 0.3*sin(2.0*w*t)*exp(-0.0010*w*t);
    y += 0.1*sin(4.0*w*t)*exp(-0.0015*w*t);
    y += 0.2*y*y*y;
    y *= 0.9 + 0.1*cos(70.0*t);
    y = 2.0*y*exp(-22.0*t) + y;
}

/*
</code>
</soundtoy>

<?xml version="1.0" encoding="ISO-8859-1"?>
<soundtoy version="0.1">
    <info name="Piano 2" date="2006" author="iq" link="http://www.iquilezles.org">
    <comments>a simple "piano"</comments>
    </info>
    <options applyeffects="yes"/>
    <code>
*/

var piano2 = function() {
    t = t + .00015*noise(12*t);
    rt = t;
    r = t*w*.2;
    r = fmod(r,1);
    a = 0.15 + 0.6*(rt);
    b = 0.65 - 0.5*(rt);
    y = 50*r*(r-1)*(r-.2)*(r-a)*(r-b);
    r = t*w*.401;
    r = fmod(r,1);
    a = 0.12 + 0.65*(rt);
    b = 0.67 - 0.55*(rt);
    y2 = 50*r*(r-1)*(r-.4)*(r-a)*(r-b);
    r = t*w*.399;
    r = fmod(r,1);
    a = 0.14 + 0.55*(rt);
    b = 0.66 - 0.65*(rt);
    y3 = 50*r*(r-1)*(r-.8)*(r-a)*(r-b);
    y += .02*noise(1000*t);
    y  /= (t*w*.0015+.1);
    y2 /= (t*w*.0020+.1);
    y3 /= (t*w*.0025+.1);
    y = (y+y2+y3)/3;
}

/*
</code>
</soundtoy>

<?xml version="1.0" encoding="ISO-8859-1"?>
<soundtoy version="0.1">
    <info name="Rythm" date="2006" author="iq" link="http://www.iquilezles.org">
    <comments>some rythmic sounds</comments>
    </info>
    <options applyeffects="yes"/>
    <code>
*/

var rhyeg = function() {
    h = fmod(t,.5);
    y = 0.2*noise(32000*h)*exp(-32*h);
    y += 1.0*noise(3200*h)*exp(-32*h);
    y += 7.0*cos( 320-100*exp(-10*h))*exp(-4*h);
    //---------
    h = fmod(t+.15,1.0);
    y += 0.5*noise(32000*h)*exp(-64*h);
    //------------
    h = fmod(t+.25,1.0);
    y += 1.0*noise(32000*h)*exp(-32*h);
    //------------
    t += .25;
    s = sign(sin(.5*6.2831*t));
    h = fmod(t,.5);
    y += 2.0*cos(6.2831*(105+11*s)*t)*exp(-6*h);
    //---------
    h = fmod(t,.125)/.125;
    y += 1.4*noise(320*h)*exp(-32*h);
    //---------
    g = .018;
    t2 = t+ .05*cos(t*6.2831);
    f = fmod(t2,g)/g;
    a = .5+.4*cos(6.2831*t2);
    f = saw(f,a);
    f = -1.0+2*f;
    f = f*f*f;
    y += f*1.5;
    //---------
    y *= .6;
}

/*
</code>
</soundtoy>

<?xml version="1.0" encoding="ISO-8859-1"?>
<soundtoy version="0.1">
    <info name="Space Piano" date="2011" author="Diego F Goberna, aka Interface" link="http://feiss.be">
    <comments>physcodelic space piano</comments>
    </info>
    <options applyeffects="yes"/>
    <code>
*/

var spacePiano = function() {
    tt= 1-t;
    a= sin(t*w*.5)*log(t+0.3)*tt;
    b= sin(t*w)*t*.4;
    c= fmod(tt,.075)*cos(pow(tt,3)*w)*t*2;
    y= (a+b+c)*tt;
}

/*
</code>
</soundtoy>
*/
