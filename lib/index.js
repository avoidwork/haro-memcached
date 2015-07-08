/**
 * Memcached persistent storage adapter for Harō
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright 2015
 * @license BSD-3-Clause
 * @link https://github.com/avoidwork/haro-memcached
 * @version 1.0.2
 */
"use strict";

var Promise = require("es6-promise").Promise;
var Map = require("es6-map");
var Client = require("memcache-plus");
var registry = new Map();

function deferred() {
	var promise = undefined,
	    resolver = undefined,
	    rejecter = undefined;

	promise = new Promise(function (resolve, reject) {
		resolver = resolve;
		rejecter = reject;
	});

	return { resolve: resolver, reject: rejecter, promise: promise };
}

function getClient(id, config) {
	if (!registry.has(id)) {
		registry.set(id, new Client(config));
	}

	return registry.get(id);
}

function adapter(store, op, key, data) {
	var defer = deferred(),
	    record = key !== undefined,
	    config = store.adapters.memcached,
	    prefix = config.prefix || store.id,
	    lkey = prefix + (record ? "_" + key : ""),
	    client = getClient(store.id, config.connection),
	    retry = undefined;

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
		retry = function () {
			client["delete"](lkey, function (e) {
				if (e) {
					defer.reject(e);
				} else {
					client.get(lkey, function (e2, reply2) {
						if (e2) {
							defer.reject(e2);
						} else if (!reply2) {
							defer.resolve(true);
						} else {
							retry();
						}
					});
				}
			});
		};

		retry();
	} else if (op === "set") {
		client.set(lkey, JSON.stringify(record ? data : store.toArray()), config.ttl || 0, function (e) {
			if (e) {
				defer.reject(e);
			} else {
				defer.resolve(true);
			}
		}, config.expiration);
	}

	return defer.promise;
}

module.exports = adapter;
