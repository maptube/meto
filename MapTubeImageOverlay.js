var MapTube = MapTube || {};


//MapTube.ImageOverlay.prototype = new google.maps.OverlayView();
		/** @constructor */
		MapTube.ImageOverlay = function(bounds, image, map) {
			// Initialize all properties.
			this.bounds_ = bounds;
			this.image_ = image;
			this.map_ = map;
			
			// Define a property to hold the image's div. We'll
			// actually create this div upon receipt of the onAdd()
			// method so we'll leave it null for now.
			this.div_ = null;
			
			// Explicitly call setMap on this overlay.
			this.setMap(map);
		}
		MapTube.ImageOverlay.prototype = new google.maps.OverlayView();
		
		/**
		* onAdd is called when the map's panes are ready and the overlay has been
		* added to the map.
		*/
		MapTube.ImageOverlay.prototype.onAdd = function() {
			console.log("MapTubeImageOverlay.onAdd");
			var div = document.createElement('div');
			div.style.borderStyle = 'none';
			div.style.borderWidth = '0px';
			div.style.position = 'absolute';

			// Create the img element and attach it to the div.
			var img = document.createElement('img');
			img.src = this.image_;
			img.style.width = '100%';
			img.style.height = '100%';
			img.style.position = 'absolute';
			div.appendChild(img);
			
			this.img_=img;
			this.div_ = div;
			
			// Add the element to the "overlayLayer" pane.
			var panes = this.getPanes();
			panes.overlayLayer.appendChild(div);
		};
		
		MapTube.ImageOverlay.prototype.draw = function() {
			// We use the south-west and north-east
			// coordinates of the overlay to peg it to the correct position and size.
			// To do this, we need to retrieve the projection from the overlay.
			var overlayProjection = this.getProjection();
			
			// Retrieve the south-west and north-east coordinates of this overlay
			// in LatLngs and convert them to pixel coordinates.
			// We'll use these coordinates to resize the div.
			var sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
			var ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());
			
			// Resize the image's div to fit the indicated dimensions.
			var div = this.div_;
			div.style.left = sw.x + 'px';
			div.style.top = ne.y + 'px';
			div.style.width = (ne.x - sw.x) + 'px';
			div.style.height = (sw.y - ne.y) + 'px';
		};
		
		// The onRemove() method will be called automatically from the API if
		// we ever set the overlay's map property to 'null'.
		MapTube.ImageOverlay.prototype.onRemove = function() {
			this.div_.parentNode.removeChild(this.div_);
			this.div_ = null;
		};
		
		// Change the src url of the currently displayed image.
		// This takes into account the fact that the "onAdd" method might not yet have
		// created the img DOM element.
		MapTube.ImageOverlay.prototype.setOverlayImageUrl = function(src) {
			this.image_=src;
			if (this.img_) this.img_.src=src;
		}
		
		MapTube.ImageOverlay.prototype.setOpacity = function(op) {
			//TODO: need a setOpacity
		};
		
		//MapTube.AnimatedOverlay.prototype = new MapTube.ImageOverlay();
		//MapTube.AnimatedOverlay.prototype.constructor=MapTube.AnimatedOverlay;
		MapTube.AnimatedOverlay = function (bounds,map) {
			console.log("MapTubeAnimatedOverlay constructor");
		//need times array and to set up src string here
			//this.baseURL = baseURL;
			//this.timeField = timeField; //e.g. {Time} which you have to replace with 2015-03-16T09:00:00
			//this.times = times;
			//this.timeStep = 0;
			//var src = baseURL.replace(this.timeField,this.times[this.timeStep]);
			//console.log("AnimatedOverlay src: "+src);
			this.time_ = null;
			var src="";
			MapTube.ImageOverlay.call(this,bounds,src,map); //call the overridden constructor
		}
		MapTube.AnimatedOverlay.prototype = new MapTube.ImageOverlay();
		MapTube.AnimatedOverlay.prototype.constructor=MapTube.AnimatedOverlay;
		
		MapTube.AnimatedOverlay.prototype.getImageUrl = function(d) {
			//returns the string of the image url given a datetime d
			return "";
		}
		
		//MapTubeAnimatedOverlay.prototype.setTimeStep = function(t) {
		//	this.timeStep = t;
		//	var src = this.baseURL.replace(this.timeField,this.times[this.timeStep]);
		//	this.img_.src=src;
		//}
		
		MapTube.AnimatedOverlay.prototype.getFrameTime = function() {
			return this.time_;
		}
		
		MapTube.AnimatedOverlay.prototype.setFrameTime = function(d) {
			//sets the time of the currently displayed frame using the getImageUrl from Date function supplied by the user
			this.time_ = d;
			var src = this.getImageUrl(d);
			console.log("Frame: "+src);
			this.setOverlayImageUrl(src);
		}