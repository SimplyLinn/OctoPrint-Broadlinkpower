# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
from octoprint.server import user_permission
import broadlink
import flask
import re

class BroadlinkpowerPlugin(octoprint.plugin.StartupPlugin,
						   						 octoprint.plugin.SettingsPlugin,
                           octoprint.plugin.AssetPlugin,
                           octoprint.plugin.TemplatePlugin,
												   octoprint.plugin.SimpleApiPlugin):

	def get_device(self, force=False):
		macStr = self._settings.get(['mac'])
		macBytes = bytes.fromhex(re.sub(r'[^a-fA-F0-9]', '', macStr))
		if force:
			self._device = None
		if not self._device:
			self._device = next((d for d in broadlink.xdiscover(discover_ip_address = self._settings.get(['searchIp'])) if d.mac == macBytes), None)
			if (self._device is not None):
				self._device.auth()
		return self._device

	def list_devices(self, discoverIp):
		devices = broadlink.discover(discover_ip_address = discoverIp)
		split = lambda s: ':'.join(s[i:i+2] for i in range(0, len(s), 2))
		macStr = lambda m: split(m.hex().upper())
		return dict(devices=[dict(mac=macStr(d.mac),name=d.name,model=d.model) for d in devices])

	##~~ StartupPlugin mixin
	def on_after_startup(self):
		self.get_device(force=True)

	def on_settings_save(self, data):
		octoprint.plugin.SettingsPlugin.on_settings_save(self, data)
		self.get_device(force=True)

	##~~ SettingsPlugin mixin

	def get_settings_defaults(self):
		return dict(mac="XX:XX:XX:XX:XX:XX", searchIp="255.255.255.255")

	##~~ AssetPlugin mixin

	def get_assets(self):
		# Define your plugin's asset files to automatically include in the
		# core UI here.
		return dict(
			js=["js/broadlinkpower.js"],
			css=["css/broadlinkpower.css"],
			less=["less/broadlinkpower.less"]
		)

	##~~ TemplatePlugin mixin

	def get_template_configs(self):
		templates_to_load = [dict(type="navbar", custom_bindings=True),dict(type="settings", custom_bindings=True)]
		return templates_to_load

	##~~ SimpleApiPlugin mixin

	def turn_on(self):
		try:
			device = self.get_device()
			device.set_power(True)
			return self.check_status()
		except:
			self._device = None
			return flask.make_response("\"error\"")

	def turn_off(self):
		try:
			device = self.get_device()
			device.set_power(False)
			return self.check_status()
		except:
			self._device = None
			return flask.make_response("\"error\"")

	def check_status(self):
		try:
			device = self.get_device()
			if device.check_power():
				return flask.make_response("\"on\"")
			else:
				return flask.make_response("\"off\"")
		except:
			self._device = None
			return flask.make_response("\"error\"")

	def get_api_commands(self):
		return dict(turnOn=[],turnOff=[],listDevices=[])

	def on_api_get(self, request):
		return self.check_status()

	def on_api_command(self, command, data):
		if not user_permission.can():
			return flask.make_response("Insufficient rights", 403)

		if command == 'turnOn':
			response = self.turn_on()
		elif command == 'turnOff':
			response = self.turn_off()
		elif command == 'listDevices':
			if 'searchIp' not in data:
				return flask.make_response("Missing searchIp", 400)
			searchIp = data['searchIp']
			if type(searchIp) == str:
				response = self.list_devices(searchIp)
			else:
				return flask.make_response("Invalid searchIp", 400)
		else:
			return flask.make_response("Not found", 404)
		return response

__plugin_name__ = "Broadlinkpower"
__plugin_pythoncompat__ = ">=3.5,<4"
def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = BroadlinkpowerPlugin()

