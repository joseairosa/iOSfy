/*
 Author: 		José P. Airosa
 Description: 	Projetizr is a tool for web developers and frontend web designers where you will be enable to use an image as a watermark.
 				You can assign images to keystrokes and enable/disable them on-the-fly, drag background image to better suit your needs and scope your work to a specific element.
 */
(function($) {
	/** This is high-level function.
	 * It must react to delta being more/less than zero.
	 */

	var _scroll_freedom_timmer = 1000;
	var _scroll_opacity = .7;
	var _scroll_incremental_freedom_timmer = 0;
	var _scroll_speed = 5.0;
	var _scroll_position = {x: null, y: null};
	var _main_timmer_speed = 250;
	var _slider_height = 0;
	var _slider_width = 0;
	var _slider_exists = {x: false, y: false};
	var _force_slide_to_show = {x: false, y: false};
	var _is_able_to_drag = {x: false, y: false};
	var _last_mouse_position = {x: null, y: null};

	var _slider_extended_detection = {x: 30, y: 30};

	// Callbacks
	var on_hide_slider = function () {};
	var on_hide_slider_x = function () {};
	var on_hide_slider_y = function () {};
	var on_show_slider = function () {};
	var on_show_slider_x = function () {};
	var on_show_slider_y = function () {};

	// This is our internal timmer that will execute the callback queue
	var _callback_queue = [];
	var _t = setInterval(function(){
		for (var i in _callback_queue) {
			_callback_queue[i]();
		}
	},_main_timmer_speed);

	// Callback queue manager
	var add_callback = function(callback) {
		_callback_queue.push(callback);
	};

	// Callbacks
	add_callback(function(){
		if(!_force_slide_to_show.x || !_force_slide_to_show.y) {
			_scroll_incremental_freedom_timmer += _main_timmer_speed;
		}
	});
	add_callback(function(){
		if(!_force_slide_to_show.x || !_force_slide_to_show.y) {
			if(_scroll_incremental_freedom_timmer >= _scroll_freedom_timmer) {
				if(!_force_slide_to_show.x) {
					hide_slide('x',function(){
						$('#slide-x').hide();
					});
				}
				if(!_force_slide_to_show.y) {
					hide_slide('y',function(){
						$('#slide-y').hide();
					});
				}
			} else {
				if(!_force_slide_to_show.x) {
					show_slide('x');
				}
				if(!_force_slide_to_show.y) {
					show_slide('y');
				}
			}
		}
	});

	var move_scroll = function(axis,scroll,move_scroll) {
		if(!move_scroll && move_scroll !== false)
			move_scroll = true;
		if(axis == 'x') {
			move_scroll_x(scroll,move_scroll);
		} else if(axis == 'y') {
			move_scroll_y(scroll,move_scroll);
		}
	};

	var move_scroll_x = function(scroll,move_scroll) {
		if(scroll < 0 && Math.abs(scroll) <= $('body').width()-$(window).width()) {
			$('body').css({
				marginLeft: scroll+'px'
			});

			if(move_scroll) {
				var scroll_percent = Math.abs(scroll/($('body').width()-$(window).width()));
				var scroll_position = parseInt(($(window).width()-$('#slide-x').width()-5)*scroll_percent,10);
				if(scroll_position < $(window).width()) {
					$('#slide-x').css({
						top: scroll_position+'px'
					});
					_scroll_position.x = scroll_position;
				}
			}
		} else if(scroll > 0) {
			// Reached left
			$('body').css({
				marginLeft: '0px'
			});
			if(move_scroll) {
				$('#slide-x').css({
					left: '0px'
				});
				_scroll_position.x = 0;
			}
		} else if(Math.abs(scroll) > $('body').width()-$(window).width()) {
			// Reached right
			$('body').css({
				marginLeft: -($('body').width()-$(window).width())+'px'
			});
			if(move_scroll) {
				var position_x = $(window).width()-$('#slide-x').width()-5;
				$('#slide-x').css({
					left: position_x+'px'
				});
				_scroll_position.x = position_x;
			}
		}
	};
	
	var move_scroll_y = function(scroll,move_scroll) {
		if(!move_scroll && move_scroll !== false)
			move_scroll = true;
		if(scroll < 0 && Math.abs(scroll) <= $('body').height()-$(window).height()) {
			$('body').css({
				marginTop: scroll+'px'
			});

			if(move_scroll) {
				var scroll_percent = Math.abs(scroll/($('body').height()-$(window).height()));
				var scroll_position = parseInt(($(window).height()-$('#slide-y').height()-5)*scroll_percent,10);
				if(scroll_position < $(window).height()) {
					$('#slide-y').css({
						top: scroll_position+'px'
					});
					_scroll_position.y = scroll_position;
				}
			}
		} else if(scroll > 0) {
			// Reached top
			$('body').css({
				marginTop: '0px'
			});
			if(move_scroll) {
				$('#slide-y').css({
					top: '0px'
				});
				_scroll_position.y = 0;
			}
		} else if(Math.abs(scroll) > $('body').height()-$(window).height()) {
			// Reached bottom
			$('body').css({
				marginTop: -($('body').height()-$(window).height())+'px'
			});
			if(move_scroll) {
				var position_y = $(window).height()-$('#slide-y').height()-5;
				$('#slide-y').css({
					top: position_y+'px'
				});
				_scroll_position.y = position_y;
			}
		}
	};

	var reset_mouse_position = function() {
		_last_mouse_position = {x: null, y: null};
	};

	function handle(delta) {
		_scroll_incremental_freedom_timmer = 0;
		var scroll = (parseInt(delta*_scroll_speed,10)+parseInt($('body').css('margin-top').replace(/[^-\d\.]/g, ''),10));
		move_scroll('y',scroll);
	}

	/** Event handler for mouse wheel event.
	 */
	function wheel(event) {
		var delta = 0;
		if (!event) /* For IE. */
			event = window.event;
		if (event.wheelDelta) { /* IE/Opera. */
			delta = event.wheelDelta / 120;
			/** In Opera 9, delta differs in sign as compared to IE.
			 */
			if (window.opera)
				delta = -delta;
		} else if (event.detail) { /** Mozilla case. */
			/** In Mozilla, sign of delta is different than in IE.
			 * Also, delta is multiple of 3.
			 */
			delta = -event.detail / 3;
		}
		/** If delta is nonzero, handle it.
		 * Basically, delta is now positive if wheel was scrolled up,
		 * and negative, if wheel was scrolled down.
		 */
		if (delta)
			handle(delta);
		/** Prevent default actions caused by mouse wheel.
		 * That might be ugly, but we handle scrolls somehow
		 * anyway, so don't bother here..
		 */
		if (event.preventDefault)
			event.preventDefault();
		event.returnValue = false;
	}

	var show_slide = function(axis,callback) {
		if(!callback)
			callback = on_show_slider;
		if(axis == 'x') {
			show_slide_x();
		} else if(axis == 'y') {
			show_slide_y();
		}
	};
	var show_slide_x = function() {
		$('#slide-x .slide-bar').show();
		if($('#slide-x .slide-bar').css('opacity') != _scroll_opacity) {
			$('#slide-x .slide-bar').fadeTo(0,_scroll_opacity,on_show_slider_x);
		}
	};
	var show_slide_y = function() {
		$('#slide-y .slide-bar').show();
		if($('#slide-y .slide-bar').css('opacity') != _scroll_opacity) {
			$('#slide-y .slide-bar').fadeTo(0,_scroll_opacity,on_show_slider_y);
		}
	};

	var hide_slide = function(axis,callback){
		if(!callback)
			callback = on_hide_slider;
		if(axis == 'x') {
			hide_slide_x();
		} else if(axis == 'y') {
			hide_slide_y();
		}
	};
	var hide_slide_x = function(){
		if($('#slide-x .slide-bar').css('opacity') != 0 && !_is_able_to_drag.x) {
			$('#slide-x .slide-bar').fadeTo(150,0,on_hide_slider_x);
		}
	};
	var hide_slide_y = function(){
		if($('#slide-y .slide-bar').css('opacity') != 0 && !_is_able_to_drag.y) {
			$('#slide-y .slide-bar').fadeTo(150,0,on_hide_slider_y);
		}
	};

	/** Initialization code.
	 * If you use your own event management code, change it as required.
	 */
	if (window.addEventListener)
	/** DOMMouseScroll is for mozilla. */
		window.addEventListener('DOMMouseScroll', wheel, false);
	/** IE/Opera. */
	window.onmousewheel = document.onmousewheel = wheel;

	_slider_height = parseInt($(window).height()*($(window).height()/$('body').height()),10);
	_slider_width = parseInt($(window).width()*($(window).width()/$('body').width()),10);

	console.log($('body').width());
	console.log($(window).width());

	if($('body').width() > $(window).width()) {
		$('body').append('<div id="slide-x" style="position: fixed; bottom: 0; left: 0;"><div class="slide-bar" style="width: '+_slider_height+'px; height: 7px; background-color: #333; margin: 15px 8px 5px 18px; -webkit-border-radius: 5px; opacity: 0; filter: alpha(opacity = 0);"></div></div>');
		_slider_exists.x = true;
	}
	if($('body').height() > $(window).height()) {
		$('body').append('<div id="slide-y" style="position: fixed; top: 0; right: 0;"><div class="slide-bar" style="width: 7px; height: '+_slider_height+'px; background-color: #333; margin: 8px 5px 8px 15px; -webkit-border-radius: 5px; opacity: 0; filter: alpha(opacity = 0);"></div></div>');
		_slider_exists.y = true;
	}

	// Apply overflow to html and body in order to get rid of scroll bars
	$('html, body').css('overflow','hidden');

	$('#slide-x').bind('mousedown.drag-x',function(){
		_is_able_to_drag.x = true;
	});
	$('#slide-y').bind('mousedown.drag-y',function(){
		_is_able_to_drag.y = true;
	});
	$(window).bind('mouseup.drag-x',function(){
		_is_able_to_drag.x = false;
		reset_mouse_position();
		hide_slide('x');
	});
	$(window).bind('mouseup.drag-y',function(){
		_is_able_to_drag.y = false;
		reset_mouse_position();
		hide_slide('y');
	});

	$(window).mousemove(function(e){
		if(e.pageY >= ($(window).height()-_slider_extended_detection.x)) {
			_force_slide_to_show.x = true;
			show_slide('x');
		} else if(e.pageX >= ($(window).width()-_slider_extended_detection.y)) {
			_force_slide_to_show.y = true;
			show_slide('y');
		} else {
			_force_slide_to_show.x = false;
			_force_slide_to_show.y = false;
		}
		var percent = 0;
		var scroll = 0;
		if(_is_able_to_drag.x) {
			if (_last_mouse_position.x == null && _last_mouse_position.y == null) {
				_last_mouse_position = {x: e.clientX, y: e.clientY};
			}

			if (e.clientX > _scroll_position.x)
				_scroll_position.x += e.clientX - _last_mouse_position.x;
			else if (e.clientY < _scroll_position.y)
				_scroll_position.x -= _last_mouse_position.x - e.clientX;

			// Make sure our scroll position never goes lower than our window height
			if(_scroll_position.x > $(window).width())
				_scroll_position.x = $(window).width();

			_last_mouse_position.x = e.clientX;

			if(_scroll_position.x > 0 && _scroll_position.x <= $(window).width()-$('#slide-x').width()-5) {
				$('#slide-x').css({
					left: _scroll_position.x+'px'
				});
			}

			percent = _scroll_position.x/($(window).width()-_slider_width);

			// We cannot go further than 100%
			if(percent > 1)
				percent = 1;

			//console.log(($('body').height() - $(window).height())*_percent);
			scroll = -(parseInt(($('body').height() - $(window).height())*percent,10));

			move_scroll('x',scroll,false);

			// Cancel out any text selections
			document.body.focus();
			// Prevent text selection in IE
			document.onselectstart = function () {
				return false;
			};
			// Prevent text selection (except IE)
			return false;

		}
		if(_is_able_to_drag.y) {
			if (_last_mouse_position.x == null && _last_mouse_position.y == null) {
				_last_mouse_position = {x: e.clientX, y: e.clientY};
			}

			if (e.clientY > _scroll_position.y)
				_scroll_position.y += e.clientY - _last_mouse_position.y;
			else if (e.clientY < _scroll_position.y)
				_scroll_position.y -= _last_mouse_position.y - e.clientY;

			// Make sure our scroll position never goes lower than our window height
			if(_scroll_position.y > $(window).height())
				_scroll_position.y = $(window).height();

			_last_mouse_position.y = e.clientY;

			if(_scroll_position.y > 0 && _scroll_position.y <= $(window).height()-$('#slide-y').height()-5) {
				$('#slide-y').css({
					top: _scroll_position.y+'px'
				});
			}

			percent = _scroll_position.y/($(window).height()-_slider_height);

			// We cannot go further than 100%
			if(percent > 1)
				percent = 1;

			//console.log(($('body').height() - $(window).height())*_percent);
			scroll = -(parseInt(($('body').height() - $(window).height())*percent,10));

			move_scroll('y',scroll,false);

			// Cancel out any text selections
			document.body.focus();
			// Prevent text selection in IE
			document.onselectstart = function () {
				return false;
			};
			// Prevent text selection (except IE)
			return false;

		}
	});
})(jQuery);