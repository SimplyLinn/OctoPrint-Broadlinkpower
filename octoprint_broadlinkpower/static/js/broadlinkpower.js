/*
 * View model for OctoPrint-BroadlinkPower
 *
 * Author: Linn Dahlgren
 * License: AGPLv3
 */
$(function () {
	function broadlinkpowerNavbarViewModel(parameters) {
		var self = this;

		self.loginState = parameters[0];
		self.isPrinting = ko.observable(false);
		self.status = ko.observable("unknown");
		self.mac = ko.observable(null);

		Object.defineProperty(self, "className", {
			get() {
				var classes = ["fa"];
				switch (self.status()) {
					case "unknown":
						classes.push("fa-spinner");
						break;
					case "on":
						classes.push("fa-toggle-on");
						break;
					case "off":
						classes.push("fa-toggle-off");
					default:
						classes.push("fa-exclamation-circle");
				}
				return classes.join(" ");
			}
		});
		self.onEventSettingsUpdated = function () {
			self.checkStatus();
		};
		self.onAfterBinding = function () {
			self.checkStatus();
		}

		self.onEventPrinterStateChanged = function (payload) {
			if (payload.state_id == "PRINTING" || payload.state_id == "PAUSED") {
				self.isPrinting(true);
			} else {
				self.isPrinting(false);
			}
		}

		self.toggleRelay = function () {
			switch (self.status()) {
				case "on":
					self.turnOff();
					break;
				case "off":
					self.turnOn();
					break;
				default:
					self.checkStatus();
			}
		}

		self.turnOn = function () {
			self.sendTurnOn();
		}

		self.sendTurnOn = function () {
			self.status("unknown");
			$.ajax({
				url: API_BASEURL + "plugin/broadlinkpower",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "turnOn"
				}),
				contentType: "application/json; charset=UTF-8"
			}).done(function (data) {
				self.status(data);
			});
		};

		self.turnOff = function () {
			if (!$("#BroadlinkPlugWarning").is(':visible')) {
				$("#BroadlinkPlugWarning").modal("show");
			} else {
				$("#BroadlinkPlugWarning").modal("hide");
				self.sendTurnOff();
			}
		};

		self.sendTurnOff = function () {
			self.status("unknown");
			$.ajax({
				url: API_BASEURL + "plugin/broadlinkpower",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "turnOff"
				}),
				contentType: "application/json; charset=UTF-8"
			}).done(function (data) {
				self.status(data);
			});
		}

		self.checkStatus = function () {
			self.status("unknown");
			$.ajax({
				url: API_BASEURL + "plugin/broadlinkpower",
				type: "GET",
				dataType: "json",
				contentType: "application/json; charset=UTF-8"
			}).done(function (data) {
				self.status(data);
			});
		};
	}

	OCTOPRINT_VIEWMODELS.push({
		construct: broadlinkpowerNavbarViewModel,
		dependencies: ["loginStateViewModel"],
		elements: ["#navbar_plugin_broadlinkpower"]
	});


	function broadlinkpowerSettingsViewModel(parameters) {
		var self = this;

		self.settingsViewModel = parameters[0];
		Object.defineProperty(self, 'settings', {
			get() {
				return self.settingsViewModel.settings;
			}
		});
		self.devices = ko.observable([]);
		self.loading = ko.observable(false);

		self.getDevices = function () {
			self.devices([]);
			self.loading(true);
			$.ajax({
				url: API_BASEURL + "plugin/broadlinkpower",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "listDevices",
					searchIp: self.settings.plugins.broadlinkpower.searchIp(),
				}),
				contentType: "application/json; charset=UTF-8",
				complete() {
					self.loading(false);
				},
			}).done(function (data) {
				self.devices(data.devices);
			});
		};
	}

	OCTOPRINT_VIEWMODELS.push({
		construct: broadlinkpowerSettingsViewModel,
		dependencies: ["settingsViewModel"],
		elements: ["#settings_plugin_broadlinkpower"]
	});
});