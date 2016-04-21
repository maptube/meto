MapTubeWMTSOverlay.prototype = new google.maps.OverlayView();

MapTubeWMTSMapType.prototype.cache = null; //was Cache - check Google doesn't need this
		MapTubeWMTSMapType.prototype.opacity = 1.0;
		MapTubeWMTSMapType.prototype.bounds = null;
		MapTubeWMTSMapType.prototype.getTileUrl = null; //=function(tilename) { return "http://"+tilename+".png"; }
		MapTubeWMTSMapType.prototype.baseUrl = "";
		MapTubeWMTSMapType.prototype.name = "MLTileData";
		MapTubeWMTSMapType.prototype.alt = "MLTileData Tiles";
		MapTubeWMTSMapType.prototype.tileSize = new google.maps.Size(256, 256);
		MapTubeWMTSMapType.prototype.minZoom = 0; //part of Google interface
		MapTubeWMTSMapType.prototype.maxZoom = -1; //part of Google interface
		MapTubeWMTSMapType.prototype.tileMaxZoom = -1; //level that tiles are created to
		function MapTubeWMTSMapType() {
			this.cache = Array();
			this.opacity = 1.0;
		}
		MapTubeWMTSMapType.prototype.getTileUrl = function(x,y,z) {
			var f = this.baseUrl.replace("{TILECOL}",x);
			f = f.replace("{TILEROW}",y);
			f = f.replace("{ZOOM}",z);
			console.log(x,y,z,f);
			return f;
		}
		MapTubeWMTSMapType.prototype.getTile = function (coord, zoom, ownerDocument) {
			//if (this.tileMaxZoom >= 0) && (zoom > this.tileMaxZoom))??????
				
			var img = ownerDocument.createElement('IMG');
			img.id = "t_" + zoom+"_"+coord.x+"_"+coord.y;
			img.style.width = this.tileSize.width + 'px';
			img.style.height = this.tileSize.height + 'px';
			img.src = this.getTileUrl(coord.x,coord.y,zoom);
			//set initial opacity on image
			img.style.opacity = this.opacity; //mozilla
			img.style.filter = "alpha(opacity=" + this.opacity * 100 + ")"; //ie
			this.cache.push(img);
			return img;
		}
		
		MapTubeWMTSMapType.prototype.realeaseTile = function(tile) {
			var idx = this.cache.indexOf(tile);
			if (idx != -1) this.cache.splice(idx, 1);
			tile = null;
		}
		
		MapTubeWMTSMapType.prototype.setOpacity = function(newOpacity) {
			this.opacity = newOpacity;
			for (var i = 0; i < this.cache.length; i++) {
				this.cache[i].style.opacity = newOpacity; //mozilla
				this.cache[i].style.filter = "alpha(opacity=" + newOpacity * 100 + ")"; //ie
			}
		}
		
		MapTubeWMTSMapType.prototype.getOpacity = function() {
			return this.opacity;
		}