//MapTube WebGL Overlay

var GeoAPI = GeoAPI || {};
var MapTube = MapTube || {};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//This isn't strictly the geoapi version of the envelope
        //http://www.geoapi.org/2.0/javadoc/org/opengis/spatialschema/geometry/Envelope.html
        GeoAPI.Envelope = function() {
            this.minx_ = 0;
            this.miny_ = 0;
            this.maxx_ = 0;
            this.maxy_ = 0;
        }
        GeoAPI.Envelope = function(minx,maxx,miny,maxy) {
            this.minx_=minx;
            this.miny_=miny;
            this.maxx_=maxx;
            this.maxy_=maxy;
        }
        //there's no width and height in the geoapi, it's supposed to be getLength(0) or getLength(1)
        GeoAPI.Envelope.prototype.width = function () { return this.maxx_ - this.minx_; }
        GeoAPI.Envelope.prototype.height = function () { return this.maxy_ - this.miny_; }
        GeoAPI.Envelope.prototype.getLength = function (dim) {
            switch (dim) {
                case 0: return this.maxx_ - this.minx_;
                case 1: return this.maxy_ - this.miny_;
            }
            return 0;
        }
        GeoAPI.Envelope.prototype.clip = function (clipminx, clipminy, clipmaxx, clipmaxy) {
            var minx = this.minx_, miny = this.miny_, maxx = this.maxx_, maxy = this.maxy_;
            if (clipminx > minx) minx = clipminx;
            if (clipmaxx < maxx) maxx = clipmaxx;
            if (clipminy > miny) miny = clipminy;
            if (clipmaxy < maxy) maxy = clipmaxy;
            return new GeoAPI.Envelope(minx, maxx, miny, maxy);
        }
		
///////////////////////////////////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //MapTube WebGL Overlay (Google Maps Custom Overlay object)

        //MapTubeWGLOverlay.prototype = new google.maps.OverlayView();

        /** @constructor */
        MapTube.WGLOverlay = function(map) {

            // Initialize all properties.
            this.map_ = map;

            // Define a property to hold the container div in onAdd
            this.div_ = null;
			
			//define event handler hooks - OK, callbacks for now
			this.initialiseRendererEvent = null;

            //define bounds of box - this is coming out later
            var swBound = new google.maps.LatLng(49.8, -6.5);
            var neBound = new google.maps.LatLng(55.8, 2);
            var bounds = new google.maps.LatLngBounds(swBound, neBound);
            this.bounds_ = bounds;
            this.map0pointbounds_ = new GeoAPI.Envelope(); //merc bounds at zoom level zero
            this.divbounds_ = new GeoAPI.Envelope(); //holds map bounds in div coords, which changes every zoom level

            //define a clip rectangle for the framebuffer
            this.cliprect_ = null;

            //some 3D stuff
            this.camera_ = null;
            this.scene_ = null;
            this.renderer_ = null;

            // Explicitly call setMap on this overlay.
            this.setMap(map);
        }
		MapTube.WGLOverlay.prototype = new google.maps.OverlayView();

        /**
         * onAdd is called when the map's panes are ready and the overlay has been
         * added to the map.
         */
        MapTube.WGLOverlay.prototype.onAdd = function () {

            var div = document.createElement('div');
            div.style.borderStyle = 'solid'; //'none';
            div.style.borderWidth = '1px';
            div.style.position = 'absolute';

            this.div_ = div;

            // Add the element to the "overlayLayer" pane.
            var panes = this.getPanes();
            panes.overlayLayer.appendChild(div);

            //set up event handlers (drag, or drag end?)
            //google.maps.event.addListener(map, 'drag', this.clipToMap.bind(this)); //flickers as you drag, but updates the bit coming into view while dragging
            google.maps.event.addListener(map, 'dragend', this.clipToMap.bind(this)); //no flicker, but the bit coming into view is missing until you drop the drag (i.e. dragend)

            animate(); //kick off the animation forever - GLOBAL!!!!
        };

        MapTube.WGLOverlay.prototype.initRenderer = function (width, height) {
            console.log("init renderer");
            //check for existing renderer and remove it
            if (this.renderer_ != null) {
                this.div_.removeChild(this.renderer_.domElement);
                this.renderer_ = null;
            }
            //scene initialisation
            var camera, scene, renderer;
            //renderer
            renderer = new THREE.WebGLRenderer({ alpha: true });
            //NO! renderer.setClearColor(0xc0e0ff);
            //NO! renderer.setClearAlpha(1.0);
            //the one below was the one being used, but does it actually work?
            //YES! renderer.setClearColor(0, 0); //sets background to transparent alpha=0
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(width, height);
            this.div_.appendChild(renderer.domElement); //attach to container div
            this.renderer_ = renderer;
            //camera = new THREE.OrthographicCamera(0, div.clientWidth, 0, div.clientHeight, 0, 100);
            camera = new THREE.OrthographicCamera(-width/2, width/2, -height/2, height/2, 1, 1000);
            camera.lookAt(new THREE.Vector3(0, 0, 0)); //this gets translated and scaled to the World below

            //old
            //var overlayProjection = this.getProjection();
            //var sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
            //var ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());

            //new
            //var mapProjection = map.getProjection();
            //var p1 = mapProjection.fromLatLngToPoint(this.bounds_.getNorthEast());
            //var p2 = mapProjection.fromLatLngToPoint(this.bounds_.getSouthWest());
            //camera.position.x = (p1.x + p2.x) / 2;
            //camera.position.y = (p1.y + p2.y) / 2;
            //camera.position.z = 400;
            //camera.scale.x = (p1.x - p2.x) / width; //(ne.x - sw.x);
            //camera.scale.y = (p2.y - p1.y) / height; //(sw.y - ne.y);

            //new2
            var mapProjection = this.map_.getProjection();
            var ne = mapProjection.fromLatLngToPoint(this.bounds_.getNorthEast());
            var sw = mapProjection.fromLatLngToPoint(this.bounds_.getSouthWest());
            this.map0pointbounds_ = new GeoAPI.Envelope(sw.x, ne.x, ne.y, sw.y); //merc bounds at zoom level zero
            camera.position.x = (this.map0pointbounds_.minx_ + this.map0pointbounds_.maxx_) / 2;
            camera.position.y = (this.map0pointbounds_.miny_ + this.map0pointbounds_.maxy_) / 2;
            camera.position.z = 400;
            camera.scale.x = this.map0pointbounds_.width() / this.divbounds_.width();
            camera.scale.y = this.map0pointbounds_.height() / this.divbounds_.height();

            this.camera_ = camera;
            scene = new THREE.Scene();
            //lights
            scene.add(new THREE.AmbientLight(0xcccccc));
            this.scene_ = scene;

            //testing
            //cube = new THREE.Mesh(
            //    new THREE.BoxGeometry(2, 2, 2),
            //    new THREE.MeshLambertMaterial({ color: 0xff2020, ambient: 0xff0000/*0xDFEEF5*/, wireframe: true })
            //    );
            //var pos = new google.maps.LatLng(52.0, 0); //place cube at 52 degrees north directly on the meridian
            //var mercpos = this.map_.getProjection().fromLatLngToPoint(pos);
            //cube.position.x = mercpos.x;
            //cube.position.y = mercpos.y;
            //cube.position.z = 0;
            //this.scene_.add(cube);
            //end testing

            //more testing - this needs to go somewhere where it gets saved
            //overlay.addFeature([new google.maps.LatLng(49.8, -6.5), new google.maps.LatLng(55.8, 2), new google.maps.LatLng(55.8, 2), new google.maps.LatLng(52.0, 0.0), new google.maps.LatLng(49.8,2), new google.maps.LatLng(55.8,-6.5)]);
            //end testing2
			
			if (this.initialiseRendererEvent)
				this.initialiseRendererEvent.call(this); //any params?
            
        }

        MapTube.WGLOverlay.prototype.draw = function () {
            console.log("draw"); //probably only on first time and zoom
            // We use the south-west and north-east
            // coordinates of the overlay to peg it to the correct position and size.
            // To do this, we need to retrieve the projection from the overlay.
            var overlayProjection = this.getProjection();

            // Retrieve the south-west and north-east coordinates of this overlay
            // in LatLngs and convert them to pixel coordinates.
            // We'll use these coordinates to resize the div.
            var sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
            var ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());
            this.divbounds_.minx_ = sw.x; this.divbounds_.maxx_ = ne.x;
            this.divbounds_.miny_ = ne.y; this.divbounds_.maxy_ = sw.y;
            console.log("sw,ne: ", sw, ne);
            //var mapProjection = map.getProjection();

            //TODO: everything below this is in clipToMap(), apart from checking whether the renderer has been created
            //now the map bounds to get the visible viewport for clipping
            var mapsw = overlayProjection.fromLatLngToDivPixel(this.map_.getBounds().getSouthWest());
            var mapne = overlayProjection.fromLatLngToDivPixel(this.map_.getBounds().getNorthEast());
            //clip (sw,ne) against (mapsw,mapne) to get the visible portion on the screen
            //this.cliprect_ = new Envelope(sw.x, ne.x, ne.y, sw.y).clip(mapsw.x,mapne.y,mapne.x,mapsw.y); //note different ordering on the clip and constructor
            this.cliprect_ = this.divbounds_.clip(mapsw.x, mapne.y, mapne.x, mapsw.y);

            // Resize the image's div to fit the indicated dimensions.
            var div = this.div_;
            //div.style.left = sw.x + 'px';
            //div.style.top = ne.y + 'px';
            //div.style.width = (ne.x - sw.x) + 'px';
            //div.style.height = (sw.y - ne.y) + 'px';
            div.style.left = this.cliprect_.minx_ + 'px';
            div.style.top = this.cliprect_.miny_ + 'px';
            div.style.width = this.cliprect_.width() + 'px';
            div.style.height = this.cliprect_.height() + 'px';

            //create renderer canvas here
            //if (this.renderer_ == null) this.initRenderer(ne.x - sw.x, sw.y - ne.y); //this requires the pixel size box to create the renderer canvas
            //else this.renderer_.setSize(ne.x - sw.x, sw.y - ne.y);
            if (this.camera_ != null) console.log("camera before: ", this.camera_.position.x, this.camera_.position.y, this.camera_.position.z, this.camera_.scale.x, this.camera_.scale.y, this.camera_.scale.z);
            if (this.renderer_ == null) this.initRenderer(this.cliprect_.width(), this.cliprect_.height()); //this requires the pixel size box to create the renderer canvas
            else this.renderer_.setSize(this.cliprect_.width(), this.cliprect_.height());
            console.log("camera after: ", this.camera_.position.x, this.camera_.position.y, this.camera_.position.z, this.camera_.scale.x, this.camera_.scale.y, this.camera_.scale.z);
            //now set the clip offset
            //this.renderer_.setViewport(
            //    -this.cliprect_.width(),
            //    -this.cliprect_.height()/2, //hack!
            //    this.cliprect_.width(),
            //    this.cliprect_.height()
            //);
            
            //these are in screen space coordinates i.e. overlay div pixels
            this.camera_.left = -this.divbounds_.width() / 2 - (this.divbounds_.minx_ - this.cliprect_.minx_);
            this.camera_.right = this.divbounds_.width() / 2 - (this.divbounds_.maxx_ - this.cliprect_.maxx_);
            this.camera_.top = -this.divbounds_.height() / 2 - (this.divbounds_.miny_ - this.cliprect_.miny_);
            this.camera_.bottom = this.divbounds_.height() / 2 - (this.divbounds_.maxy_ - this.cliprect_.maxy_);
            this.camera_.updateProjectionMatrix();
            console.log("camera after2: ", this.camera_.position.x, this.camera_.position.y, this.camera_.position.z, this.camera_.scale.x, this.camera_.scale.y, this.camera_.scale.z);
            //put scale back after update projection matrix changes it
            this.camera_.scale.x = this.map0pointbounds_.width() / this.divbounds_.width();
            this.camera_.scale.y = this.map0pointbounds_.height() / this.divbounds_.height();
            console.log("divbounds: ", this.divbounds_.minx_, this.divbounds_.maxx_, this.divbounds_.miny_, this.divbounds_.maxy_);
            console.log("cliprect: ", this.cliprect_.minx_,this.cliprect_.maxx_,this.cliprect_.miny_,this.cliprect_.maxy_);
        };

        MapTube.WGLOverlay.prototype.clipToMap = function () {
            //clip the data bounds to the current map limits visible on the screen

            if (this.renderer_ == null) return; //nothing to do clipping on, wait for it to be initialised

            var overlayProjection = this.getProjection();

            //now the map bounds to get the visible viewport for clipping
            var mapsw = overlayProjection.fromLatLngToDivPixel(this.map_.getBounds().getSouthWest());
            var mapne = overlayProjection.fromLatLngToDivPixel(this.map_.getBounds().getNorthEast());
            //clip (sw,ne) against (mapsw,mapne) to get the visible portion on the screen
            this.cliprect_ = this.divbounds_.clip(mapsw.x, mapne.y, mapne.x, mapsw.y);

            // Resize the image's div to fit the indicated dimensions.
            var div = this.div_;
            div.style.left = this.cliprect_.minx_ + 'px';
            div.style.top = this.cliprect_.miny_ + 'px';
            div.style.width = this.cliprect_.width() + 'px';
            div.style.height = this.cliprect_.height() + 'px';

            this.renderer_.setSize(this.cliprect_.width(), this.cliprect_.height());

            //these are in screen space coordinates i.e. overlay div pixels
            this.camera_.left = -this.divbounds_.width() / 2 - (this.divbounds_.minx_ - this.cliprect_.minx_);
            this.camera_.right = this.divbounds_.width() / 2 - (this.divbounds_.maxx_ - this.cliprect_.maxx_);
            this.camera_.top = -this.divbounds_.height() / 2 - (this.divbounds_.miny_ - this.cliprect_.miny_);
            this.camera_.bottom = this.divbounds_.height() / 2 - (this.divbounds_.maxy_ - this.cliprect_.maxy_);
            this.camera_.updateProjectionMatrix();
            
            //put scale back after update projection matrix changes it
            this.camera_.scale.x = this.map0pointbounds_.width() / this.divbounds_.width();
            this.camera_.scale.y = this.map0pointbounds_.height() / this.divbounds_.height();
        };

        // The onRemove() method will be called automatically from the API if
        // we ever set the overlay's map property to 'null'.
        MapTube.WGLOverlay.prototype.onRemove = function () {
            this.div_.parentNode.removeChild(this.div_);
            this.div_ = null;
            //todo: remove event listener? - how?
        };

        //Add something onto the map using lat/lon coords
        //Data is drawn to the buffers in Google's Mercator projection where it fits a box 256x256 for the whole world. This is what is returned by map.getProjection().fromLatLngToPoint()
        MapTube.WGLOverlay.prototype.addFeature = function (pts) {
            //OK, so the render canvas fits the lat lon bounds box.
            //This defines how the coordinates map to webgl. There are two mappings going on here, firstly
            //the box places itself correctly onto the map, then we need to put points onto that canvas so
            //they fit over the correct places on the map.
            //var overlayProjection = this.getProjection();
            //var sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
            //var ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());
            var mapProjection = map.getProjection();
            //div pixels are Mercator, so that's what we're drawing in
            var material = new THREE.LineBasicMaterial({
                color: 0x0000ff
            });
            var geometry = new THREE.Geometry();
            for (var i = 0; i < pts.length; i++) {
                //var p = overlayProjection.fromLatLngToDivPixel(pts[i]);
                //geometry.vertices.push(new THREE.Vector3(p.x-(sw.x+ne.x)/2,p.y-(sw.y+ne.y)/2,0));
                var p = mapProjection.fromLatLngToPoint(pts[i]);
                geometry.vertices.push(new THREE.Vector3(p.x,p.y,0));
            }
            var line = new THREE.Line(geometry, material, THREE.LinePieces/*THREE.LineStrip*/); //THREE.LinePieces is GL_LINES pairs, LineStrip is the tristrip
            this.scene_.add(line);
        };

        function animate() {
            requestAnimationFrame(animate);
            if (overlay.renderer_!=null) {
                //cube.rotation.x += 0.01;
                //cube.rotation.y += 0.01;
                overlay.renderer_.render(overlay.scene_, overlay.camera_); //note use of global overlay
            }
        };

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
