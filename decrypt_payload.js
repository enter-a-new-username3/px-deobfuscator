function xor(t, e) {
    for (var n = "", r = 0; r < t.length; r++) n += String.fromCharCode(e ^ t.charCodeAt(r));
    return n;
}

var ya;

function ho() {
    return ya;
}

function call_btoa(t) {
    return btoa(encodeURIComponent(t).replace(/%([0-9A-F]{2})/g, function(t, e) {
        return String.fromCharCode("0x" + e);
    }))
}

function call_atob(t) {
    return decodeURIComponent(atob(t).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

var qs = function(t, e, n, r, a) {
    return Math.floor((t - e) / (n - e) * (a - r) + r);
};

function typeoff(e) {
    return t = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(t) {
        return typeof t;
    } : function(t) {
        return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
    }, t(e);
}

function j(t) {
    return /[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g.lastIndex = 0, '"' + (/[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g.test(t) ? t.replace(/[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, J) : t) + '"';
}

function something_like_json_stringify(e) {
    var n;
    switch (typeof(e)) {
        case "undefined":
            return "null";
        case "boolean":
            return String(e);
        case "number":
            var r = String(e);
            return "NaN" === r || "Infinity" === r ? "null" : r;
        case "string":
            return j(e);
    }
    if (null === e || e instanceof RegExp) return "null";
    if (e instanceof Date) return ['"', e.getFullYear(), "-", e.getMonth() + 1, "-", e.getDate(), "T", e.getHours(), ":", e.getMinutes(), ":", e.getSeconds(), ".", e.getMilliseconds(), '"'].join("");
    if (e instanceof Array) {
        var a;
        for (n = ["["], a = 0; a < e.length; a++) n.push(something_like_json_stringify(e[a]) || '"undefined"', ",");
        return n[n.length > 1 ? n.length - 1 : n.length] = "]", n.join("");
    }
    for (var o in n = ["{"], e) e.hasOwnProperty(o) && void 0 !== e[o] && n.push(j(o), ":", something_like_json_stringify(e[o]) || '"undefined"', ",");
    return n[n.length > 1 ? n.length - 1 : n.length] = "}", n.join("");
}

function xor(s, t) {
    let sBytes = Buffer.from(s, 'utf-8');
    for (let i = 0; i < sBytes.length; i++) {
        sBytes[i] ^= t;
    }
    return sBytes.toString('utf-8');
}

function decryptPayload(payload, cu, timestamp = "1604064986000") {
    var xored_timestamp = xor(call_btoa(timestamp), 10);

    var calculated_key = function(xored_timestamp_local, xored_payload1_length_local, cu_local) {
        var xored_cu = xor(call_btoa(cu_local), 10);
        var m = [];
        var g = -1;

        for (y = 0; y < xored_timestamp_local.length; y++) {
            var b = Math.floor(y / xored_cu.length + 1)
            var E = y >= xored_cu.length ? y % xored_cu.length : y
            var S = xored_cu.charCodeAt(E) * xored_cu.charCodeAt(b);
            if (S > g)
                (g = S);
        }
        for (var T = 0; xored_timestamp_local.length > T; T++) {
            var A = Math.floor(T / xored_cu.length) + 1,
                R = T % xored_cu.length,
                w = xored_cu.charCodeAt(R) * xored_cu.charCodeAt(A);
            for (w >= xored_payload1_length_local && (w = qs(w, 0, g, 0, xored_payload1_length_local - 1)); - 1 !== m.indexOf(w);)
                w += 1;
            m.push(w);
        }
        return m.sort(function(t, e) {
            return t - e;
        });
    }(xored_timestamp, payload.length - xored_timestamp.length, cu);

    var current_payload_idx = 0
    var i = 0;

    const fuckyou = {}

    for (var u = 0; u < xored_timestamp.length; u++) {
        var part_length = calculated_key[u] - u - i
        var current_part = payload.substring(current_payload_idx, current_payload_idx + part_length - 1)
        fuckyou[i] = current_part
        current_payload_idx += part_length
        i = calculated_key[u] - u - 1
    }
    fuckyou[current_payload_idx] = payload.substring(current_payload_idx)

    let buffer = []; // Simulates StringIO

    // Emulate the behavior of seek and write
    Object.entries(fuckyou).forEach(([idx, value]) => {
        buffer[parseInt(idx)] = value;
    });



    let result = buffer.join('');
    return xor(call_atob(result), 50)
}

exports.decodePayload = decryptPayload
