
var MapTube = MapTube || {};
MapTube.Meto = MapTube.Meto || {};
MapTube.Meto.Converters = MapTube.Meto.Converters || {};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////

//synop contains:
//Wind Gust
//Temperature
//Visibility
//Wind Direction
//Wind Speed
//Weather Type
//Pressure
//station name
//lat,lon

		//helper for creating synop objects
		MapTube.Meto.SynopRecord = function (iii,lat,lon,name,totalcloud,winddir,windspeed) {
			return {
				'iii' : iii,
				'latLng' : new google.maps.LatLng(lat,lon),
				'stationName' : name,
				'totalCloud' : totalcloud,
				'windDir' : winddir,
				'windSpeed' : windspeed
			};
		}
		
		///////////////////////////////////////////////////////////////////////////////////////////////////////////////
		//this goes into a meto converters namespace

		//convert knots to metres per second
		MapTube.Meto.Converters.KnotsToMetresPerSec = function (knots) {
            return knots*0.51444444;
        }
		
		//convert miles per hour to metres per second
		MapTube.Meto.Converters.MilesPerHourToMetresPerSec = function (mph) {
			return mph*0.44704;
		}
		
		MapTube.Meto.Converters.MilesPerHourToKnots = function (mph) {
			return mph*0.868976;
		}
		
		//convert a compass point string (i.e. N, NNE, SW etc) into a bearing angle (i.e. 0, 22.5, 225)
		MapTube.Meto.Converters.CompassPointToBearing = function (compass) {
			var p16='N  |NNE|NE |ENE|E  |ESE|SE |SSE|S  |SSW|SW |WSW|W  |WNW|NW |NNW|';
			compass=compass.toUpperCase();
			if (compass.length==1) compass=compass+"  |";
			else if (compass.length==2) compass=compass+" |";
			else compass=compass+"|";
			var pos=p16.indexOf(compass);
			if (pos>=0) return (pos>>2)*22.5;		
			return -1; //error
		}
		
		
		///////////////////////////////////////////////////////////////////////////////////////////////////////////////

		/** @constructor */
        MapTube.Meto.SynopOverlay = function(map) {
			this.synopObject = new THREE.Object3D();
			//geometry?
			MapTube.WGLOverlay.call(this,map); //call the overridden constructor
		}
		MapTube.Meto.SynopOverlay.prototype = new MapTube.WGLOverlay();
		
		MapTube.Meto.SynopOverlay.prototype.addSynops = function(synops) {
		//add geometry to this._scene
			var mapProjection = this.map_.getProjection();
			var material = new THREE.LineBasicMaterial({
                color: 0x000000
            });
			var material2 = new THREE.MeshBasicMaterial({
				color: 0x000000
			});
            var geometry = new THREE.Geometry();
			var trigeometry = new THREE.Geometry();
			var r=0.15; //circle radius, where the world is 256x256, coords in Google Mercator origin top left
			for (var i=0; i<synops.length; i++) {
				var p = mapProjection.fromLatLngToPoint(synops[i].latLng);
                //geometry.vertices.push(new THREE.Vector3(p.x,p.y,0));
				//todo: here - there is no total cloud! use vis or present wx?
				this.fillOktasCircle(geometry,trigeometry,p,r,synops[i].totalCloud); //r should be smaller
				this.drawWindFleche(geometry,trigeometry,p,r,synops[i].windDir,synops[i].windSpeed);
			}
			var lines = new THREE.Line(geometry, material, THREE.LinePieces);
			this.scene_.add(lines);
			var triangles = new THREE.Mesh(trigeometry,material2);
			this.scene_.add(triangles);
		}
		
		MapTube.Meto.SynopOverlay.prototype.drawCircle = function(geom,x,y,r) {
			//draw an outline circle
			var sin=0,cos=1;
			for (var i=1; i<=12; i++) {
				geom.vertices.push(new THREE.Vector3(x+r*sin,y+r*cos,0)); //push last point
				//recalculate new point
				var a = Math.PI*2*i/12;
				sin=Math.sin(a);
				cos=Math.cos(a);
				geom.vertices.push(new THREE.Vector3(x+r*sin,y+r*cos,0)); //push new point
			}
		}
		
		MapTube.Meto.SynopOverlay.prototype.fillOktasCircle = function(geom,trigeom,p,length,oktas) {
			//draw the centre part of the station circle based on the cloud cover in oktas
			//see: http://www.metoffice.gov.uk/media/pdf/a/t/No._11_-_Weather_Charts.pdf
			//TODO: don't have a code for the two sky obscured report types (see below)
			//also, it might be better to draw theses as textures, although vectors are more adaptable
			//SKC=circle
			//1=vertical line
			//2=Q1
			//3=Q1+line
			//4=Q1+Q2
			//5=Q1+Q2+line
			//6=Q1+Q2+Q3
			//7=filled, missing vertical bar in centre
			//8=filled
			//sky obscured by met e.g. fog=cross (x)
			//sky obscured not met=two horizontal lines
			var r=0.25*length;
			this.drawCircle(geom,p.x,p.y,r); //draw outer circle first
			var o = Math.floor(oktas/2)*3;
			switch (oktas) {
				case 0: return;
				case 1:
					this.drawLine(geom,p.x,p.y-r,p.x,p.y+r); //vertical bar
					return;
				case 7: //filled with missing central vertical bar
					var sin=0,cos=1;
					var x1=p.x+r*Math.sin(0.1),y1=p.y-r*Math.cos(0.1),x2=0,y2=0;
					var cx=x1, cy=p.y;
					for (var i=1; i<=6; i++) {
						var a = Math.PI*2*i/12;
						if (i==6) a-=0.1; //same 0.01 as above
						sin=Math.sin(a);
						cos=Math.cos(a);
						x2=p.x+r*sin; y2=p.y-r*cos;
						//right semicircle triangle
						this.fillTriangle(trigeom,cx,cy,x2,y2,x1,y1); //need ccw ordering
						//left semicircle triangle (reflected in line x=p.x)
						this.fillTriangle(trigeom,2*p.x-cx,cy,2*p.x-x1,y1,2*p.x-x2,y2);
						x1=x2; y1=y2;
					}
					return;
				default:
					var sin=0,cos=1;
					var x1=p.x,y1=p.y-r,x2=0,y2=0;
					for (var i=0; i<=12; i++) {
						if (i>o) break;
						var a = Math.PI*2*i/12;
						sin=Math.sin(a);
						cos=Math.cos(a);
						x2=p.x+r*sin; y2=p.y-r*cos;
						this.fillTriangle(trigeom,p.x,p.y,x2,y2,x1,y1); //need ccw ordering
						x1=x2; y1=y2;
					}
			}
			//now the quadrant lines for 3,5
			switch (oktas) {
				case 3:
					this.drawLine(geom,p.x,p.y,p.x,p.y+r);
					break;
				case 5:
					this.drawLine(geom,p.x,p.y,p.x-r,p.y);
			}
		}
		
		MapTube.Meto.SynopOverlay.prototype.fillTriangle = function(trigeom,x1,y1,x2,y2,x3,y3) {
			//TODO: this is actually drawing lines for now
			//trigeom.vertices.push(new THREE.Vector3(x1,y1,0));
			//trigeom.vertices.push(new THREE.Vector3(x2,y2,0));
			//
			//trigeom.vertices.push(new THREE.Vector3(x2,y2,0));
			//trigeom.vertices.push(new THREE.Vector3(x3,y3,0));
			//
			//trigeom.vertices.push(new THREE.Vector3(x3,y3,0));
			//trigeom.vertices.push(new THREE.Vector3(x1,y1,0));
			
			var N = trigeom.vertices.length;
			trigeom.vertices.push(new THREE.Vector3(x1,y1,0));
			trigeom.vertices.push(new THREE.Vector3(x2,y2,0));
			trigeom.vertices.push(new THREE.Vector3(x3,y3,0));
			trigeom.faces.push(new THREE.Face3(N,N+1,N+2));
		}
		
		MapTube.Meto.SynopOverlay.prototype.drawLine = function(geom,x1,y1,x2,y2) {
			//draw a line
			geom.vertices.push(new THREE.Vector3(x1,y1,0));
			geom.vertices.push(new THREE.Vector3(x2,y2,0));
		}
		
		MapTube.Meto.SynopOverlay.prototype.drawWindFleche = function(geom,trigeom,p,length,direction,knots) {
            //Circle: Calm, 0 knots
            //Just stick: 1..2 Knots
            //Half fleche: 3..7 Knots (intervals of 5)
            //Full fleche: 8..12 Knots (intervals of 10)
            //Triangle: 48..52 Knots (intervals of 50)
            
            var calmRadius=0.3*length;
			var circleRadius=0.25*length; //radius of the total cloud inner circle (start of fleche)
            var fsize=0.3; //size of fleche relative to length
            var flecheSepLen=0.1; //distance between this fleche and the next relative to stick length
            var triBase=0.15; //size of triangle base relative to length (also affects fleche angle)
            var triSepLen=0.2; //distance between this triangle and next relative to stick length
            var triFlecheSepLen=0.05; //additional separation between last triangle and first fleche
            
            if (knots<1) {
                this.drawCircle(geom,p.x,p.y,calmRadius);
                return;
            }
            
            var numTriangles=Math.floor((knots+2)/50);
            var rem=(knots+2)%50;
            var numFullFleches=Math.floor(rem/10);
            rem=rem%10;
            var halfFleche=(rem>=5);
            
            var radDir=direction*Math.PI/180.0;
			var xStart=p.x+circleRadius*Math.sin(radDir);
			var yStart=p.y-circleRadius*Math.cos(radDir);
            var xEnd=p.x+length*Math.sin(radDir);
            var yEnd=p.y-length*Math.cos(radDir);
            var dx=p.x-xEnd,dy=p.y-yEnd; //vector along line from end to start point
            var nx=dy,ny=-dx; //normal to stick line
            this.drawLine(geom,xStart,yStart,xEnd,yEnd); //draw stick
            
            var xp=xEnd,yp=yEnd;
            
            //draw any triangles
            for (var i=0; i<numTriangles; i++) {
				var pts = [
					xp,yp,
					xp+nx*fsize,yp+ny*fsize,
					xp+dx*triBase,yp+dy*triBase
				];
				//old outline code
				//this.drawLine(geom,pts[0],pts[1],pts[2],pts[3]);
				//this.drawLine(geom,pts[2],pts[3],pts[4],pts[5]);
				//new filled triangle code
				this.fillTriangle(trigeom,pts[4],pts[5],pts[2],pts[3],pts[0],pts[1]); //ccw
				xp+=dx*triSepLen; yp+=dy*triSepLen;
            }
            
            //add additional separation between last triangle and first fleche
            if (numTriangles>0) { xp+=dx*triFlecheSepLen; yp+=dy*triFlecheSepLen; }
            
            //and any full fleches
            //calculate fleche tip parallel to triangle by moving back to previous triangle tip and
            //moving the two fleche line points along in step.
            var xFleche=xp-dx*triBase+nx*fsize; //triBase used as fleche angle matches triangle angle
            var yFleche=yp-dy*triBase+ny*fsize;
            for (var i=0; i<numFullFleches; i++) {
                this.drawLine(geom,xp,yp,xFleche,yFleche);
                xp+=dx*flecheSepLen;      yp+=dy*flecheSepLen;
                xFleche+=dx*flecheSepLen; yFleche+=dy*flecheSepLen;
            }
            
            //and a half fleche if present, taking into account that a single one is offset
            if (halfFleche) {
                xFleche=xp+(nx*fsize-dx*triBase)/2.0; //triBase used as fleche angle matches triangle angle
                yFleche=yp+(ny*fsize-dy*triBase)/2.0;
                if (knots<8) {
                    xp+=dx*flecheSepLen;      yp+=dy*flecheSepLen;
                    xFleche+=dx*flecheSepLen; yFleche+=dy*flecheSepLen;
                }
                this.drawLine(geom,xp,yp,xFleche,yFleche);
            }
        }
