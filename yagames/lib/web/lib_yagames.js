var LibYaGamesPrivate = {
    $YaGamesPrivate: {
        _ysdk: null,
        _player: null,
        _payments: null,
        _context: null,

        _callback_object: null,
        _callback_string: null,
        _callback_empty: null,
        _callback_number: null,
        _callback_bool: null,

        toErrStr: function (err) {
            return err + "";
        },

        parseJson: function (json) {
            try {
                return JSON.parse(json);
            } catch (e) {
                return null;
            }
        },

        send: function (cb_id, message_id, message) {
            if (YaGamesPrivate._callback_object) {
                // 0 and 1 are reserved IDs
                if (cb_id == 0 && message_id == "init") {
                    YaGamesPrivate._ysdk = message;
                    message = undefined;
                }

                var cmsg_id = 0;
                if (typeof message_id === "string") {
                    cmsg_id = allocate(intArrayFromString(message_id), "i8", ALLOC_NORMAL);
                }
                switch (typeof message) {
                    case "undefined":
                        dynCall("vii", YaGamesPrivate._callback_empty, [cb_id, cmsg_id]);
                        break;
                    case "number":
                        dynCall("viif", YaGamesPrivate._callback_number, [cb_id, cmsg_id, message]);
                        break;
                    case "string":
                        var msg = allocate(intArrayFromString(message), "i8", ALLOC_NORMAL);
                        dynCall("viii", YaGamesPrivate._callback_string, [cb_id, cmsg_id, msg]);
                        Module._free(msg);
                        break;
                    case "object":
                        var msg = JSON.stringify(message);
                        msg = allocate(intArrayFromString(msg), "i8", ALLOC_NORMAL);
                        dynCall("viii", YaGamesPrivate._callback_object, [cb_id, cmsg_id, msg]);
                        Module._free(msg);
                        break;
                    case "boolean":
                        var msg = message ? 1 : 0;
                        dynCall("viii", YaGamesPrivate._callback_bool, [cb_id, cmsg_id, msg]);
                        break;
                    default:
                        console.warn("Unsupported message format: " + typeof message);
                }
                if (cmsg_id) {
                    Module._free(cmsg_id);
                }
            } else {
                // console.warn("You didn't set callback for YaGamesPrivate");
                if (typeof YaGamesPrivate_MsgQueue !== "undefined") {
                    YaGamesPrivate_MsgQueue.push([cb_id, message_id, message]);
                }
            }
        },

        delaySend: function (cb_id, message_id, message) {
            setTimeout(() => {
                YaGamesPrivate.send(cb_id, message_id, message);
            }, 0);
        },
    },

    YaGamesPrivate_RegisterCallbacks: function (
        callback_object,
        callback_string,
        callback_empty,
        callback_number,
        callback_bool
    ) {
        var self = YaGamesPrivate;

        self._callback_object = callback_object;
        self._callback_string = callback_string;
        self._callback_empty = callback_empty;
        self._callback_number = callback_number;
        self._callback_bool = callback_bool;

        while (typeof YaGamesPrivate_MsgQueue !== "undefined" && YaGamesPrivate_MsgQueue.length) {
            var m = YaGamesPrivate_MsgQueue.shift();
            self.send(m[0], m[1], m[2]);
        }
    },

    YaGamesPrivate_RemoveCallbacks: function () {
        var self = YaGamesPrivate;

        self._callback_object = null;
        self._callback_string = null;
        self._callback_empty = null;
        self._callback_number = null;
        self._callback_bool = null;
    },

    YaGamesPrivate_ShowFullscreenAdv: function (cb_id) {
        var self = YaGamesPrivate;
        try {
            self._ysdk.adv.showFullscreenAdv({
                callbacks: {
                    onClose: (wasShown) => {
                        self.send(cb_id, "close", wasShown);
                    },
                    onOpen: () => {
                        self.send(cb_id, "open");
                    },
                    onOffline: () => {
                        self.send(cb_id, "offline");
                    },
                    onError: (err) => {
                        self.send(cb_id, "error", self.toErrStr(err));
                    },
                },
            });
        } catch (err) {
            self.delaySend(cb_id, "error", self.toErrStr(err));
            self.delaySend(cb_id, "close", false);
        }
    },

    YaGamesPrivate_ShowRewardedVideo: function (cb_id) {
        var self = YaGamesPrivate;
        try {
            self._ysdk.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => {
                        self.send(cb_id, "open");
                    },
                    onRewarded: () => {
                        self.send(cb_id, "rewarded");
                    },
                    onClose: () => {
                        self.send(cb_id, "close");
                    },
                    onError: (err) => {
                        self.send(cb_id, "error", self.toErrStr(err));
                    },
                },
            });
        } catch (err) {
            self.delaySend(cb_id, "error", self.toErrStr(err));
            self.delaySend(cb_id, "close");
        }
    },

    YaGamesPrivate_OpenAuthDialog: function (cb_id) {
        var self = YaGamesPrivate;
        try {
            self._ysdk.auth
                .openAuthDialog()
                .then(() => {
                    self.send(cb_id);
                })
                .catch((err) => {
                    self.send(cb_id, self.toErrStr(err));
                });
        } catch (err) {
            self.delaySend(cb_id, self.toErrStr(err));
        }
    },

    YaGamesPrivate_DeviceInfo_IsDesktop: function () {
        return YaGamesPrivate._ysdk.deviceInfo.isDesktop();
    },

    YaGamesPrivate_DeviceInfo_IsMobile: function () {
        return YaGamesPrivate._ysdk.deviceInfo.isMobile();
    },

    YaGamesPrivate_DeviceInfo_IsTablet: function () {
        return YaGamesPrivate._ysdk.deviceInfo.isTablet();
    },

    YaGamesPrivate_GetPayments: function (cb_id, coptions) {
        var self = YaGamesPrivate;
        try {
            var options = self.parseJson(UTF8ToString(coptions));
            self._ysdk
                .getPayments(options)
                .then((payments) => {
                    self._payments = payments;
                    self.send(cb_id);
                })
                .catch((err) => {
                    self.send(cb_id, self.toErrStr(err));
                });
        } catch (err) {
            self.delaySend(cb_id, self.toErrStr(err));
        }
    },

    YaGamesPrivate_Payments_Purchase: function (cb_id, coptions) {
        var self = YaGamesPrivate;
        try {
            var options = self.parseJson(UTF8ToString(coptions));
            self._payments
                .purchase(options)
                .then((p) => {
                    var tmp = {
                        developerPayload: p.developerPayload,
                        productID: p.productID,
                        purchaseTime: p.purchaseTime,
                        purchaseToken: p.purchaseToken,
                        signature: p.signature,
                    };
                    self.send(cb_id, null, JSON.stringify(tmp));
                })
                .catch((err) => {
                    self.send(cb_id, self.toErrStr(err));
                });
        } catch (err) {
            self.delaySend(cb_id, self.toErrStr(err));
        }
    },

    YaGamesPrivate_Payments_GetPurchases: function (cb_id) {
        var self = YaGamesPrivate;
        try {
            self._payments
                .getPurchases()
                .then((purchases) => {
                    var tmp = {
                        purchases: [],
                        signature: purchases.signature,
                    };
                    for (var i = 0; i < purchases.length; i++) {
                        var p = purchases[i];
                        tmp.purchases.push({
                            developerPayload: p.developerPayload,
                            productID: p.productID,
                            purchaseTime: p.purchaseTime,
                            purchaseToken: p.purchaseToken,
                        });
                    }

                    self.send(cb_id, null, JSON.stringify(tmp));
                })
                .catch((err) => {
                    self.send(cb_id, self.toErrStr(err));
                });
        } catch (err) {
            self.delaySend(cb_id, self.toErrStr(err));
        }
    },

    YaGamesPrivate_Payments_GetCatalog: function (cb_id) {
        var self = YaGamesPrivate;
        try {
            self._payments
                .getCatalog()
                .then((products) => {
                    self.send(cb_id, null, JSON.stringify(products));
                })
                .catch((err) => {
                    self.send(cb_id, self.toErrStr(err));
                });
        } catch (err) {
            self.delaySend(cb_id, self.toErrStr(err));
        }
    },

    YaGamesPrivate_Payments_ConsumePurchase: function (cb_id, cpurchase_token) {
        var self = YaGamesPrivate;
        try {
            var purchase_token = UTF8ToString(cpurchase_token);
            self._payments
                .consumePurchase(purchase_token)
                .then(() => {
                    self.send(cb_id, null);
                })
                .catch((err) => {
                    self.send(cb_id, self.toErrStr(err));
                });
        } catch (err) {
            self.delaySend(cb_id, self.toErrStr(err));
        }
    },

    YaGamesPrivate_GetPlayer: function (cb_id, coptions) {
        var self = YaGamesPrivate;
        try {
            var options = self.parseJson(UTF8ToString(coptions));
            self._ysdk
                .getPlayer(options)
                .then((player) => {
                    self._player = player;
                    self.send(cb_id);
                })
                .catch((err) => {
                    self.send(cb_id, self.toErrStr(err));
                });
        } catch (err) {
            self.delaySend(cb_id, self.toErrStr(err));
        }
    },

    YaGamesPrivate_Player_GetID: function () {
        var self = YaGamesPrivate;
        var cid = allocate(intArrayFromString("" + self._player.getID()), "i8", ALLOC_NORMAL);
        return cid;
    },

    YaGamesPrivate_Player_GetIDsPerGame: function (cb_id) {
        var self = YaGamesPrivate;
        try {
            self._player
                .getIDsPerGame()
                .then((arr) => {
                    self.send(cb_id, null, JSON.stringify(arr));
                })
                .catch((err) => {
                    self.send(cb_id, self.toErrStr(err));
                });
        } catch (err) {
            self.delaySend(cb_id, self.toErrStr(err));
        }
    },

    YaGamesPrivate_Player_GetName: function () {
        var self = YaGamesPrivate;
        var cname = allocate(intArrayFromString(self._player.getName()), "i8", ALLOC_NORMAL);
        return cname;
    },

    YaGamesPrivate_Player_GetPhoto: function (csize) {
        var self = YaGamesPrivate;
        var size = UTF8ToString(csize);
        var cname = allocate(intArrayFromString(self._player.getPhoto(size)), "i8", ALLOC_NORMAL);
        return cname;
    },

    YaGamesPrivate_Player_GetUniqueID: function () {
        var self = YaGamesPrivate;
        var cid = allocate(intArrayFromString(self._player.getUniqueID()), "i8", ALLOC_NORMAL);
        return cid;
    },

    YaGamesPrivate_Player_SetData: function (cb_id, cdata, flush) {
        var self = YaGamesPrivate;
        try {
            var data = self.parseJson(UTF8ToString(cdata));
            self._player
                .setData(data, flush)
                .then(() => {
                    self.send(cb_id);
                })
                .catch((err) => {
                    self.send(cb_id, self.toErrStr(err));
                });
        } catch (err) {
            self.delaySend(cb_id, self.toErrStr(err));
        }
    },

    YaGamesPrivate_Player_GetData: function (cb_id, ckeys) {
        var self = YaGamesPrivate;
        try {
            var keys = ckeys === 0 ? undefined : self.parseJson(UTF8ToString(ckeys));
            self._player
                .getData(keys)
                .then((result) => {
                    self.send(cb_id, null, JSON.stringify(result));
                })
                .catch((err) => {
                    self.send(cb_id, self.toErrStr(err));
                });
        } catch (err) {
            self.delaySend(cb_id, self.toErrStr(err));
        }
    },

    YaGamesPrivate_Player_SetStats: function (cb_id, cstats) {
        var self = YaGamesPrivate;
        try {
            var stats = self.parseJson(UTF8ToString(cstats));
            self._player
                .setStats(stats)
                .then(() => {
                    self.send(cb_id);
                })
                .catch((err) => {
                    self.send(cb_id, self.toErrStr(err));
                });
        } catch (err) {
            self.delaySend(cb_id, self.toErrStr(err));
        }
    },

    YaGamesPrivate_Player_IncrementStats: function (cb_id, cincrements) {
        var self = YaGamesPrivate;
        try {
            var increments = self.parseJson(UTF8ToString(cincrements));
            self._player
                .incrementStats(increments)
                .then((result) => {
                    self.send(cb_id, null, JSON.stringify(result));
                })
                .catch((err) => {
                    self.send(cb_id, self.toErrStr(err));
                });
        } catch (err) {
            self.delaySend(cb_id, self.toErrStr(err));
        }
    },

    YaGamesPrivate_Player_GetStats: function (cb_id, ckeys) {
        var self = YaGamesPrivate;
        try {
            var keys = ckeys === 0 ? undefined : self.parseJson(UTF8ToString(ckeys));
            self._player
                .getStats(keys)
                .then((result) => {
                    self.send(cb_id, null, JSON.stringify(result));
                })
                .catch((err) => {
                    self.send(cb_id, self.toErrStr(err));
                });
        } catch (err) {
            self.delaySend(cb_id, self.toErrStr(err));
        }
    },

    YaGamesPrivate_Banner_Init: function (cb_id) {
        var self = YaGamesPrivate;

        (function (w, d, n, s, t) {
            w[n] = w[n] || [];
            w[n].push(function () {
                self._context = {};
                self.send(cb_id);
            });
            t = d.getElementsByTagName("script")[0];
            s = d.createElement("script");
            s.type = "text/javascript";
            s.src = "//an.yandex.ru/system/context.js";
            s.async = true;
            s.onerror = () => {
                self.send(cb_id, "Error loading SDK.");
            };
            t.parentNode.insertBefore(s, t);
        })(window, window.document, "yandexContextAsyncCallbacks");
    },

    YaGamesPrivate_Banner_Create: function (crtb_id, coptions, cb_id) {
        var self = YaGamesPrivate;
        var rtbId = UTF8ToString(crtb_id);
        var options = coptions === 0 ? {} : self.parseJson(UTF8ToString(coptions));

        if (self._context[rtbId]) {
            if (cb_id) self.send(cb_id, "Banner " + rtbId + " already exists");
            return;
        }

        var banner = {
            rtbId: rtbId,
            domElement: document.createElement("div"),
            domId: "yandex_rtb_" + rtbId,
            statId: options.stat_id,
        };
        self._context[rtbId] = banner;

        banner.domElement.id = banner.domId;
        banner.domElement.style.position = "absolute";

        if (options.css_styles) banner.domElement.style.cssText = options.css_styles;
        if (options.css_class) banner.domElement.className = options.css_class;
        if (options.display) banner.domElement.style.display = options.display;

        document.body.appendChild(banner.domElement);

        Ya.Context.AdvManager.render(
            {
                blockId: banner.rtbId,
                renderTo: banner.domId,
                statId: banner.statId,
                async: true,
                onRender: (data) => {
                    if (cb_id) self.send(cb_id, null, JSON.stringify(data));
                },
            },
            () => {
                if (cb_id) self.send(cb_id, "No ads available.");
            }
        );
    },

    YaGamesPrivate_Banner_Destroy: function (crtb_id) {
        var self = YaGamesPrivate;
        var rtbId = UTF8ToString(crtb_id);

        if (!self._context[rtbId]) {
            return;
        }

        var banner = self._context[rtbId];
        delete self._context[rtbId];

        banner.domElement.remove();
    },

    YaGamesPrivate_Banner_Refresh: function (crtb_id, cb_id) {
        var self = YaGamesPrivate;
        var rtbId = UTF8ToString(crtb_id);

        if (!self._context[rtbId]) {
            if (cb_id) self.send(cb_id, "Banner " + rtbId + " doesn't exist");
            return;
        }

        var banner = self._context[rtbId];
        Ya.Context.AdvManager.render(
            {
                blockId: banner.rtbId,
                renderTo: banner.domId,
                statId: banner.statId,
                async: true,
                onRender: (data) => {
                    if (cb_id) self.send(cb_id, null, JSON.stringify(data));
                },
            },
            () => {
                if (cb_id) self.send(cb_id, "No ads available.");
            }
        );
    },

    YaGamesPrivate_Banner_Set: function (crtb_id, cproperty, cvalue) {
        var self = YaGamesPrivate;
        var rtbId = UTF8ToString(crtb_id);
        if (!self._context[rtbId]) {
            return;
        }
        var banner = self._context[rtbId];

        var property = UTF8ToString(cproperty);
        var value = UTF8ToString(cvalue);

        if (property == "css_styles") banner.domElement.style.cssText = value;
        else if (property == "css_class") banner.domElement.className = value;
        else if (property == "display") banner.domElement.style.display = value;
        else if (property == "stat_id") banner.statId = value;
    },
};

autoAddDeps(LibYaGamesPrivate, "$YaGamesPrivate");
mergeInto(LibraryManager.library, LibYaGamesPrivate);
