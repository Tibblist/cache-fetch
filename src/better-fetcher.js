var exports = (module.exports = {});
var cacheName = '';
var defaultTimeout = 5000;
var credentials = 'same-origin';
var defaultHeaders = {
	GET: {},
	POST: {},
	PUT: {},
	DELETE: {},
	ALL: {}
};

exports.setCacheName = function(name) {
	cacheName = name;
};

exports.getCacheName = function() {
	return cacheName;
};

exports.setDefaultTimeOut = function(ms) {
	defaultTimeout = ms;
};

exports.getDefaultTimeOut = function() {
	return defaultTimeout;
};

exports.setDefaultCredentialsPolicy = function(mode) {
	credentialsPolicy = mode;
};

exports.getDefaultCredentialsPolicy = function() {
	return credentialsPolicy;
};

exports.setDefaultHeaders = function(headers, type) {
	defaultHeaders[type] = headers;
};

exports.getDefaultHeaders = function(type) {
	return defaultHeaders[type];
};

/*
url:
Set to the destination that you want to fetch data from.
options:
matchAll - Set flag true to match all responses in the cache instead of first hit
dataType - Types include: "json", "blob", "formData", "arrayBuffer", "text", "raw"
init - Pass through init object to fetch call manually.
timeout - timeout (in ms) to set on the api call.
handleCachedResponse - Manually specify a function to be used only for returned cached data.
handleNetworkResponse - Manually specify a function to be used only for returned network data.
useCache - Flag to check cache and return 
callback:
The function to be called with data as it is received. Expect this function to be called multiple times given that it will likely first be called with cache data and then called with updated network data. 
Do not rely on it being called twice however given that it won't be called a second time if network data returns first or cache data does not exist
*/
exports.get = function(url, options = {}, callback) {
	var networkDataReceived = false;
	var cacheResponse = {};

	options = checkDefaults(options, 'GET');

	// fetch fresh data
	var networkCall = timeoutPromise(options.timeout || defaultTimeout, fetch(url, options.init))
		.then(handleResponse)
		.then(function(response) {
			return handleNetworkResponse(response, options, callback);
		});

	// fetch cached data
	if (options.useCache) checkCaches(url, options, callback);

	return networkCall;
};

/*
options:
init - init to pass through to fetch
Takes in a string or a json object to stringify.
*/
exports.post = function(url, data, options) {
	options = prepareData(data, options, 'POST');
	options.init.method = 'POST';

	return timeoutPromise(options.timeout || defaultTimeout, fetch(url, options.init)).then(function(response) {
		if (!response.ok) {
			throw response;
		} else {
			return response;
		}
	});
};

/*
options:
init - init to pass through to fetch
*/
exports.put = function(url, data, options) {
	options = prepareData(data, options, 'PUT');
	options.init.method = 'PUT';

	return timeoutPromise(options.timeout || defaultTimeout, fetch(url, options.init)).then(function(response) {
		if (!response.ok) {
			throw response;
		} else {
			return response;
		}
	});
};

exports.delete = function(url, options) {
	options = checkDefaults(options, 'DELETE');
	options.init.method = 'DELETE';

	return timeoutPromise(options.timeout || defaultTimeout, fetch(url, options.init)).then(handleResponse);
};

function checkCaches(url, options, callback) {
	if (!options.matchAll) {
		caches
			.match(url)
			.then(handleResponse)
			.then(function(response) {
				return handleCacheResponse(response, options, callback);
			})
			.catch(function(error) {
				console.log(error);
			});
	} else {
		caches
			.match(url) //.matchAll(url)
			.then(handleResponse)
			.then(function(response) {
				return handleCacheResponse(response, options, callback);
			})
			.catch(function(error) {
				console.log(error);
			});
	}
}

function prepareData(data, options, type) {
	options = checkDefaults(options, type);
	if (isObject(data)) {
		data = JSON.stringify(data);
		options.init.headers = {
			'Content-type': 'application/json'
		};
	}
	options.init.body = data;
	return options;
}

function checkDefaults(options, type) {
	if (!options) options = {};
	if (!options.init) options.init = {};
	if (!options.init.credentials) options = changeCredentials(options);
	options = changeHeaders(options, type);

	return options;
}

function changeHeaders(options, type) {
	const header = {};
	Object.keys(defaultHeaders.ALL).forEach((key) => (result[key] = defaultHeaders.ALL[key]));
	Object.keys(defaultHeaders[type]).forEach((key) => (result[key] = defaultHeaders[type][key]));
	if (options.init.header) Object.keys(options.init.header).forEach((key) => (result[key] = options.init.header[key]));

	if (Object.keys(header).length > 0) options.init.header = header;
	return options;
}

function changeCredentials(options) {
	options.init.credentials = credentials;
	return options;
}

function handleResponse(response) {
	if (!response) {
		return new Promise(function(resolve, reject) {
			reject('No response');
		});
	} else if (!response.ok) {
		throw response;
	} else {
		return response;
	}
}

function handleNetworkResponse(response, options, callback) {
	if (!options.useCache) {
		return handleResponseData(response, options);
	} else {
		if (!options.dataType) {
			if (options.handleNetworkResponse instanceof Function) options.handleNetworkResponse(response);
			else callback(response);
		} else {
			console.log(options.dataType);
			handleResponseData(response, options).then(function(data) {
				networkDataReceived = true;
				if (options.handleNetworkResponse instanceof Function) options.handleNetworkResponse(data);
				else callback(data); ///Implement object comparison?
			});
		}
	}
}

function handleCacheResponse(response, options, callback) {
	if (!options.dataType) {
		if (options.handleCachedResponse instanceof Function) options.handleCachedResponse(response);
		else callback(response); ///Implement object comparison?
	} else {
		return handleResponseData(response, options).then(function(data) {
			if (options.handleCachedResponse instanceof Function) options.handleCachedResponse(data);
			else callback(data); ///Implement object comparison?
		});
	}
}

function handleResponseData(response, options) {
	switch (options.dataType) {
		case 'json':
			return response.json();
		case 'blob':
			return response.blob();
		case 'arrayBuffer':
			return response.arrayBuffer();
		case 'formData':
			return response.formData();
		case 'text':
			return response.text();
		default:
			return response;
	}
}

function timeoutPromise(ms, promise) {
	return new Promise((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			reject(new Error('Request Timeout'));
		}, ms);
		promise.then(
			(res) => {
				clearTimeout(timeoutId);
				resolve(res);
			},
			(err) => {
				clearTimeout(timeoutId);
				reject(err);
			}
		);
	});
}

function isObject(obj) {
	return obj === Object(obj);
}
