/*
	Загрузочный экран «Арена Силы».
	GMod вызывает GameDetails, SetFilesTotal, SetFilesNeeded, DownloadingFile, SetStatusChanged.
	Если страницу открыть в обычном браузере — включается демонстрация загрузки.
	Код на ES5: работает и в старом встроенном браузере GMod.
*/
(function () {
	var cfg = window.LOADING_CONFIG || {};
	var $ = function (id) { return document.getElementById(id); };

	var state = { total: 0, needed: 0, status: "", gotDetails: false, demo: false };

	// ---------------------------------------------------------------- масштаб сцены 1920×1080
	var stage = $("stage");
	function fit() {
		var w = window.innerWidth || document.documentElement.clientWidth;
		var h = window.innerHeight || document.documentElement.clientHeight;
		var k = Math.min(w / 1920, h / 1080);
		var t = "scale(" + k + ")";
		stage.style.webkitTransform = t;
		stage.style.transform = t;
	}
	fit();
	window.onresize = fit;

	// ---------------------------------------------------------------- логотип
	var logo = $("logo");
	if (cfg.logo) logo.src = cfg.logo;
	logo.onload = function () { logo.className = "on"; };
	if (logo.complete) logo.className = "on";

	// ---------------------------------------------------------------- слайды
	var slides = cfg.slides || [];
	var slideEls = [];
	var holder = $("slides");
	for (var i = 0; i < slides.length; i++) {
		var el = document.createElement("div");
		el.className = "slide";
		el.style.backgroundImage = "url('" + slides[i] + "')";
		holder.appendChild(el);
		slideEls.push(el);
	}
	var cur = -1;
	function nextSlide() {
		if (!slideEls.length) return;
		var prev = slideEls[cur];
		cur = (cur + 1) % slideEls.length;
		var el = slideEls[cur];
		// перезапуск плавного приближения
		el.className = "slide";
		void el.offsetWidth;
		el.className = "slide on zoom";
		if (prev && prev !== el) {
			setTimeout(function () { prev.className = "slide"; }, 2100);
		}
	}
	nextSlide();
	if (slideEls.length > 1) setInterval(nextSlide, (cfg.slideSeconds || 8) * 1000);

	// ---------------------------------------------------------------- стороны
	if (cfg.showSides !== false && cfg.sides) {
		var sidesBox = $("sides");
		for (var s = 0; s < cfg.sides.length; s++) {
			var d = cfg.sides[s];
			var card = document.createElement("div");
			card.className = "side";
			card.style.borderTopColor = d.color;
			card.innerHTML =
				'<div class="glow" style="background: -webkit-linear-gradient(top, ' + d.color + ' 0%, transparent 100%); background: linear-gradient(to bottom, ' + d.color + ' 0%, transparent 100%);"></div>' +
				'<div class="name" style="color:' + d.color + '">' + d.name + '</div>' +
				'<div class="motto">' + d.motto + '</div>' +
				'<div class="text">' + d.text + '</div>';
			sidesBox.appendChild(card);
			(function (c, delay) { setTimeout(function () { c.className = "side on"; }, delay); })(card, 400 + s * 180);
		}
	}

	// ---------------------------------------------------------------- советы
	var tips = (cfg.tips || []).slice(0);
	for (var t = tips.length - 1; t > 0; t--) {
		var j = Math.floor(Math.random() * (t + 1));
		var tmp = tips[t]; tips[t] = tips[j]; tips[j] = tmp;
	}
	var tipIndex = -1;
	function nextTip() {
		if (!tips.length) { $("tip").style.display = "none"; return; }
		var box = $("tip");
		box.className = "off";
		setTimeout(function () {
			tipIndex = (tipIndex + 1) % tips.length;
			$("tip-text").innerHTML = tips[tipIndex];
			box.className = "";
		}, 500);
	}
	nextTip();
	setInterval(nextTip, (cfg.tipSeconds || 7) * 1000);

	// ---------------------------------------------------------------- прогресс
	function setProgress(frac, label) {
		frac = Math.max(0, Math.min(1, frac || 0));
		$("bar-fill").style.width = (frac * 100).toFixed(1) + "%";
		$("percent").innerHTML = Math.round(frac * 100) + "%";
		if (label) $("status").innerHTML = label;
	}

	function update() {
		if (state.total > 0) {
			var done = state.total - state.needed;
			setProgress(done / state.total, state.needed > 0 ? ("Загрузка файлов: " + done + " / " + state.total) : state.status || "Файлы загружены");
		}
	}

	var statusMap = [
		[/^Retrieving server info/i, "Получение данных сервера"],
		[/^Sending client info/i, "Отправка данных клиента"],
		[/^Mounting Addons/i, "Подключение аддонов"],
		[/^Workshop Complete/i, "Мастерская загружена"],
		[/^Client info sent/i, "Данные отправлены"],
		[/^Starting Lua/i, "Запуск Lua"],
		[/^Loading/i, "Загрузка"],
		[/^Downloading/i, "Скачивание"],
		[/^Lua Starting/i, "Запуск Lua"],
		[/^Sending/i, "Отправка"],
		[/^Parsing game info/i, "Подготовка мира"]
	];
	function translate(s) {
		for (var k = 0; k < statusMap.length; k++) {
			if (statusMap[k][0].test(s)) return statusMap[k][1] + s.replace(statusMap[k][0], "");
		}
		return s;
	}

	// API GMod
	window.GameDetails = function (servername, serverurl, mapname, maxplayers, steamid, gamemode) {
		state.gotDetails = true;
		state.demo = false;
		$("server").innerHTML = servername || "";
		$("map").innerHTML = mapname || "";
		$("players").innerHTML = (maxplayers ? ("до " + maxplayers + " игроков") : "");
		setProgress(0.02, "Подключение");
	};
	window.SetFilesTotal = function (total) { state.total = total; update(); };
	window.SetFilesNeeded = function (needed) { state.needed = needed; update(); };
	window.DownloadingFile = function (fileName) {
		$("file").innerHTML = fileName ? String(fileName).replace(/</g, "&lt;") : "";
	};
	window.SetStatusChanged = function (status) {
		state.status = translate(String(status || ""));
		if (state.total > 0 && state.needed > 0) update();
		else {
			var frac = /Lua/i.test(status) ? 0.92 : (/Workshop|Mounting/i.test(status) ? 0.7 : 0.4);
			setProgress(Math.max(frac, parseFloat($("bar-fill").style.width) / 100 || 0), state.status);
		}
	};

	// ---------------------------------------------------------------- демонстрация в браузере
	setTimeout(function () {
		if (state.gotDetails) return;
		state.demo = true;
		$("server").innerHTML = "Арена Силы | Force Arena";
		$("map").innerHTML = "rp_naboo_hangar";
		$("players").innerHTML = "до 64 игроков";
		var total = 286, needed = total;
		state.total = total;
		var files = ["materials/lscs/effects/lightsaber_core.vmt", "models/player/jedi.mdl", "sound/lscs/equip.mp3", "resource/fonts/Exo2-Bold.ttf", "lua/force_arena/ui/cl_menu.lua"];
		var iv = setInterval(function () {
			if (!state.demo) { clearInterval(iv); return; }
			needed = Math.max(0, needed - Math.floor(3 + Math.random() * 7));
			state.needed = needed;
			window.DownloadingFile(files[Math.floor(Math.random() * files.length)]);
			update();
			if (needed <= 0) {
				clearInterval(iv);
				window.SetStatusChanged("Starting Lua...");
			}
		}, 220);
	}, 1500);
})();
