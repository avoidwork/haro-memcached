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

const Promise = require("es6-promise").Promise;
const Map = require("es6-map");
const memjs = require("memjs");
let registry = new Map();

function deferred () {
	let promise, resolver, rejecter;

	promise = new Promise(function (resolve, reject) {
		resolver = resolve;
		rejecter = reject;
	});

	return {resolve: resolver, reject: rejecter, promise: promise};
}

function getClient (id, locations, auth) {
	if (!registry.has(id)) {
		registry.set(id, memjs.Client.create(locations, auth));
	}

	return registry.get(id);
}

function adapter (store, op, key, data) {
	let defer = deferred(),
		record = key !== undefined,
		config = store.adapters.memcached,
		prefix = config.prefix || store.id,
		lkey = prefix + (record ? "_" + key : ""),
		client = getClient(store.id, config.locations, config.auth);

	if (op === "get") {
		client.get(lkey, function (e, reply) {
			let result = JSON.parse(reply ? reply.toString() : null);

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
		client.delete(lkey, function (e) {
			if (e) {
				defer.reject(e);
			} else {
				defer.resolve(true);
			}
		});
	} else if (op === "set") {
		client.set(lkey, JSON.stringify(record ? data : store.toArray()), function (e) {
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
