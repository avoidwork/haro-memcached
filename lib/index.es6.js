/**
 * Memcached persistent storage adapter for Harō
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright 2015
 * @license BSD-3-Clause
 * @link https://github.com/avoidwork/haro-memcached
 * @version 1.0.0
 */
"use strict";

const Promise = require("es6-promise").Promise;
const Map = require("es6-map");
const Memcached = require("memcached");
let registry = new Map();

function deferred () {
	let promise, resolver, rejecter;

	promise = new Promise(function (resolve, reject) {
		resolver = resolve;
		rejecter = reject;
	});

	return {resolve: resolver, reject: rejecter, promise: promise};
}

function getClient (id, locations, options) {
	if (!registry.has(id)) {
		registry.set(id, new Memcached(locations, options));
	}

	return registry.get(id);
}

function mcached (store, op, key, data) {
	let defer = deferred(),
		record = key !== undefined,
		config = store.adapters.memcached,
		prefix = config.prefix || store.id,
		lkey = prefix + (record ? "_" + key : ""),
		client = getClient(store.id, config.locations, config.options);

	if (op === "get") {
		client.get(lkey, function (e, reply) {
			let result = JSON.parse(reply || null);

			if (e) {
				defer.reject(e);
			} else if (result) {
				defer.resolve(result);
			} else if (record) {
				defer.reject(new Error("Record not found in memcached"));
			} else {
				defer.reject([]);
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
		client.set(lkey, JSON.stringify(data), config.lifetime, function (e) {
			if (e) {
				defer.reject(e);
			} else {
				defer.resolve(true);
			}
		});
	}

	return defer.promise;
}

module.exports = mcached;
