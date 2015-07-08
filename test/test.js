var adapter = require("../lib/index.js"),
	haro = require("haro"),
	memjs = require("memjs"),
	data = [{guid: "abc", yay: true}, {guid: "def", yay: false}],
	config = {
		key: "guid",
		logging: false,
		adapters: {
			memcached: {
				prefix: "nodeunit",
				locations: "localhost:11211",
				lifetime: 600
			}
		}
	},
    client = memjs.Client.create(config.adapters.memcached.locations),
	lifetime = config.adapters.memcached.lifetime;

function clone (arg) {
	return JSON.parse(JSON.stringify(arg));
}

exports["get - datastore"] = {
	setUp: function (done) {
		this.data = clone(data);
		this.client = client;
		this.store = haro(null, config);
		this.store.register("memcached", adapter);
		this.key = this.store.adapters.memcached.prefix;
		this.client.set(this.key, JSON.stringify(this.data), function () {
			done();
		}, lifetime);
	},
	test: function (test) {
		var self = this;

		test.expect(3);
		test.equal(this.store.total, 0, "Should be 0");

		this.client.get("nodeunit", function (e, data) {
			var result = JSON.parse(data ? data.toString() : null);

			if (e) {
				console.error(e.stack || e.message);
				test.done();
			} else {
				self.store.load("memcached").then(function () {
					test.equal(result.length, 2, "Should be 2");
					test.equal(self.store.total, 2, "Should be 2");
					test.done();
				}, function (e) {
					console.error(e.stack || e.message || e); test.done();
				});
			}
		});
	}
};

exports["get - record"] = {
	setUp: function (done) {
		this.data = clone(data);
		this.client = client;
		this.store = haro(null, config);
		this.store.register("memcached", adapter);
		this.key = this.store.adapters.memcached.prefix + "_" + this.data[0].guid;
		this.client.set(this.key, JSON.stringify(this.data[0]), function () {
			done();
		});
	},
	test: function (test) {
		var self = this;

		test.expect(3);
		test.equal(this.store.total, 0, "Should be 0");
		this.client.get(this.key, function (e, data) {
			var result = JSON.parse(data ? data.toString() : null);

			if (e) {
				console.error(e.stack || e.message);
				test.done();
			} else {
				test.equal(result.guid, self.data[0].guid, "Should match");
				self.store.load("memcached", result.guid).then(function () {
					test.equal(self.store.total, 1, "Should be 1");
					test.done();
				}, function (e) {
					console.error(e.stack || e.message || e); test.done();
				});
			}
		});
	}
};

exports["set - datastore"] = {
	setUp: function (done) {
		this.data = clone(data);
		this.client = client;
		this.store = haro(null, config);
		this.store.register("memcached", adapter);
		this.key = this.store.adapters.memcached.prefix;
		done();
	},
	test: function (test) {
		var self = this;

		test.expect(3);
		test.equal(this.store.total, 0, "Should be 0");
		this.store.batch(this.data, "set").then(function () {
			test.equal(self.store.total, 2, "Should be 2");
			return self.store.save("memcached");
		}, function (e) {
			throw e;
		}).then(function () {
			self.client.get(self.key, function (e, data) {
				var ldata = JSON.parse(data ? data.toString() : null);

				if (e) {
					console.error(e.stack || e.message);
				} else {
					test.equal(JSON.stringify(self.store.toArray()), JSON.stringify(ldata), "Should match");
				}

				test.done();
			});
		}, function (e) {
			console.error(e.stack || e.message || e); test.done();
		});
	}
};

exports["set - record"] = {
	setUp: function (done) {
		this.data = clone(data);
		this.client = client;
		this.store = haro(null, config);
		this.store.register("memcached", adapter);
		this.key = this.store.adapters.memcached.prefix;
		this.client.set(this.key, JSON.stringify(this.data), function () {
			done();
		});
	},
	test: function (test) {
		var self = this;

		test.expect(6);
		test.equal(this.store.total, 0, "Should be 0");
		this.client.get(this.key, function (e, data) {
			var result = JSON.parse(data ? data.toString() : null);

			self.store.load("memcached").then(function () {
				test.equal(result.length, 2, "Should be 2");
				test.equal(self.store.total, 2, "Should be 2");
				return self.store.set(null, {guid: "ghi", yay: true});
			}, function (e) {
				throw e;
			}).then(function (arg) {
				self.client.get(self.key + "_" + arg[0], function (e, data) {
					var record = JSON.parse(data ? data.toString() : null);

					test.equal(self.store.total, 3, "Should be 3");
					test.equal(arg[0], record.guid, "Should match");
					test.equal(self.store.limit(1, 2)[0][0], record.guid, "Should match");
					self.store.unload("memcached");
					test.done();
				});
			}, function (e) {
				console.log(e.stack);
				test.done();
			});
		});
	}
};

exports["remove - datastore"] = {
	setUp: function (done) {
		this.data = clone(data);
		this.client = client;
		this.store = haro(null, config);
		this.store.register("memcached", adapter);
		this.key = this.store.adapters.memcached.prefix;
		done();
	},
	test: function (test) {
		var self = this;

		test.expect(3);
		test.equal(this.store.total, 0, "Should be 0");
		this.store.batch(this.data, "set").then(function () {
			test.equal(self.store.total, 2, "Should be 2");
			return self.store.save("memcached");
		}, function (e) {
			throw e;
		}).then(function () {
			return self.store.unload("memcached");
		}, function (e) {
			throw e;
		}).then(function () {
			self.client.get(self.key, function (e, data) {
				var ldata = JSON.parse(data ? data.toString() : null);

				if (e) {
					console.error(e.stack || e.message);
				} else {
					test.equal(ldata, null, "Should match");
				}

				test.done();
			});
		}, function (e) {
			console.error(e.stack || e.message || e); test.done();
		});
	}
};

exports["remove - record"] = {
	setUp: function (done) {
		this.data = clone(data);
		this.client = client;
		this.store = haro(null, config);
		this.store.register("memcached", adapter);
		this.key = this.store.adapters.memcached.prefix;
		done();
	},
	test: function (test) {
		var self = this,
			key;

		test.expect(3);
		test.equal(this.store.total, 0, "Should be 0");
		this.store.batch(this.data, "set").then(function (args) {
			key = args[0][0];
			test.equal(self.store.total, 2, "Should be 2");
			return self.store.unload("memcached", key);
		}, function (e) {
			throw e;
		}).then(function () {
			self.client.get(self.key + "_" + key, function (e, data) {
				var ldata = JSON.parse(data ? data.toString() : null);

				if (e) {
					console.error(e.stack || e.message);
				} else {
					test.equal(ldata, null, "Should match");
				}

				self.store.unload("memcached");
				test.done();
			});
		}, function (e) {
			console.error(e.stack || e.message || e); test.done();
		});
	}
};
