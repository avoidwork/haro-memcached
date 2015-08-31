/**
 * Memcached persistent storage adapter for Harō
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright 2015
 * @license BSD-3-Clause
 * @link https://github.com/avoidwork/haro-memcached
 * @version 1.0.5
 */
"use strict";

var deferred = require("tiny-defer");
var Map = require("es6-map");
var Memcached = require("memcached");

var registry = new Map();

function getClient(id, locations, options) {
	if (!registry.has(id)) {
		registry.set(id, new Memcached(locations, options));
	}

	return registry.get(id);
}

function adapter(store, op, key, data) {
	var defer = deferred(),
	    record = key !== undefined,
	    config = store.adapters.memcached,
	    prefix = config.prefix || store.id,
	    lkey = prefix + (record ? "_" + key : ""),
	    client = getClient(store.id, config.locations, config.options);

	if (op === "get") {
		client.get(lkey, function (e, reply) {
			var result = JSON.parse(reply ? reply.toString() : null);

			if (e) {
				defer.reject(e);
			} else if (result) {
				defer.resolve(result);
			} else if (record) {
				defer.reject(new Error("Record not found in memcached"));
			} else {
				defer.resolve([]);
			}
		});
	} else if (op === "remove") {
		client.del(lkey, function (e) {
			if (e) {
				defer.reject(e);
			} else {
				defer.resolve(true);
			}
		});
	} else if (op === "set") {
		client.set(lkey, JSON.stringify(record ? data : store.toArray()), config.ttl || 0, function (e) {
			if (e) {
				defer.reject(e);
			} else {
				defer.resolve(true);
			}
		});
	}

	return defer.promise;
}

module.exports = adapter;
