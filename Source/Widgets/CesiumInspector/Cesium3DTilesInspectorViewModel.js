/*global define*/
define([
    '../../Core/Cartesian3',
    '../../Core/Cartographic',
    '../../Scene/Cesium3DTileset',
    '../../Scene/Cesium3DTileStyle',
    '../../Core/Check',
    '../../Core/Color',
    '../../Core/defined',
    '../../Core/defineProperties',
    '../../Core/destroyObject',
    '../../Core/EasingFunction',
    '../../Scene/HorizontalOrigin',
    '../../ThirdParty/knockout',
    '../../Scene/LabelCollection',
    '../../Core/Math',
    '../../Core/Matrix3',
    '../../Core/Matrix4',
    '../../Core/Transforms',
    '../../Scene/PerformanceDisplay',
    '../../Core/Quaternion',
    '../../Core/ScreenSpaceEventHandler',
    '../../Core/ScreenSpaceEventType',
    '../../Scene/VerticalOrigin',
    '../createCommand',
    'ThirdParty/when'
    ], function(
        Cartesian3,
        Cartographic,
        Cesium3DTileset,
        Cesium3DTileStyle,
        Check,
        Color,
        defined,
        defineProperties,
        destroyObject,
        EasingFunction,
        HorizontalOrigin,
        knockout,
        LabelCollection,
        Math,
        Matrix3,
        Matrix4,
        Transforms,
        PerformanceDisplay,
        Quaternion,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        VerticalOrigin,
        createCommand,
        when) {
    'use strict';

    function createKnockoutBindings(model, options) {
        var names = [];
        var name;
        for (name in options) {
            if (options.hasOwnProperty(name)) {
                names.push(name);
                model[name] = options[name].default;
            }
        }
        knockout.track(model, names);

        for (name in options) {
            if (options.hasOwnProperty(name)) {
                var subscription = options[name].subscribe;
                if (subscription) {
                    model._subscriptions[name] = knockout.getObservable(model, name).subscribe(subscription);
                }
            }
        }
    }

    /**
     * The view model for {@link Cesium3DTilesInspector}.
     * @alias Cesium3DTilesInspectorViewModel
     * @constructor
     *
     * @param {Scene} scene The scene instance to use.
     * @param {Function} onLoad Callback on tileset load
     * @param {Function} onUnload Callback on tileset unload
     * @param {Function} onSelect Callback on feature select
     *
     * @exception {DeveloperError} scene is required.
     */
    function Cesium3DTilesInspectorViewModel(scene, onLoad, onUnload, onSelect) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object(scene, 'scene');
        //>>includeEnd('debug');

        var that = this;
        var canvas = scene.canvas;
        var eventHandler = new ScreenSpaceEventHandler(canvas);
        this._scene = scene;
        this._canvas = canvas;
        // this._annotations = new LabelCollection();

        this._performanceDisplay = new PerformanceDisplay({
            container: document.createElement('div')
        });

        this.highlightColor = new Color(1.0, 1.0, 0.0, 0.4);

        var tilesetOptions = {
            /**
             * Gets or sets the flag to show stats.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            showStats: {
                default: true,
                subscribe: function(val) {
                    if (that._tileset) {
                        // force an update of stats because the toggle has been enabled
                        that._updateStats(false, true);
                    }
                }
            },
            /**
             * Gets or sets the flag to show pick stats.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            showPickStats: {
                default: true,
                subscribe: function(val) {
                    if (that._tileset && val) {
                        // force an update of pick stats because the toggle has been enabled
                        that._updateStats(true, true);
                    }
                }
            },
            /**
             * Gets or sets the flag to enable picking.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default true
             */
            picking: {
                default: true,
                subscribe: (function() {
                    return function(val) {
                        if (val) {
                            eventHandler.setInputAction(function(e) {
                                that._feature = scene.pick(e.endPosition);
                                that._updateStats(true, false);
                                // if (that._tileset) {

                                    // showStats(that._tileset, true, false);
                                // }
                            }, ScreenSpaceEventType.MOUSE_MOVE);
            //
            //                 eventHandler.setInputAction(function() {
            //                     if (defined(that._feature)) {
            //                         onSelect(that._feature);
            //                     }
            //                 }, ScreenSpaceEventType.LEFT_CLICK);
            //
            //                 eventHandler.setInputAction(function(e) {
            //                     if (that.annotatePicked) {
            //                         annotate(e.position);
            //                     }
            //                     if (that.zoomPicked) {
            //                         zoom(that._feature);
            //                     }
            //                 }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
            //
            //                 eventHandler.setInputAction(function() {
            //                     if (defined(that._feature) && that.hidePicked) {
            //                         that._feature.show = false;
            //                     }
            //                 }, ScreenSpaceEventType.MIDDLE_DOUBLE_CLICK);
                        } else {
                            that._feature = undefined;
                            eventHandler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
            //                 eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
            //                 eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
            //                 eventHandler.removeInputAction(ScreenSpaceEventType.MIDDLE_DOUBLE_CLICK);
                        }
                    };
                })()
            },
            /**
             * Gets or sets the flag to annotate features on double click.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            // annotatePicked: {
            //     default: false
            // },
            /**
             * Gets or sets the flag to fly to features on double click.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default true
             */
            // zoomPicked: {
            //     default: true
            // },
            /**
             * Gets or sets the flag to hide features on double middle mouse click.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default true
             */
            // hidePicked: {
            //     default: true
            // },
            /**
             * Gets or sets the flag to suspend updates.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            suspendUpdates: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugFreezeFrame = val;
                    }
                }
            },
            /**
             * Gets or sets the flag to colorize tiles.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            colorize: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugColorizeTiles = val;
                    }
                }
            },
            /**
             * Gets or sets the flag to draw with wireframe.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            wireframe: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugWireframe = val;
                    }
                }
            },
            /**
             * Gets or sets the flag to show bounding volumes.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            showBoundingVolumes: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugShowBoundingVolume = val;
                    }
                }
            },
            /**
             * Gets or sets the flag to show content volumes.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            showContentBoundingVolumes: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugShowContentBoundingVolume = val;
                    }
                }
            },
            /**
             * Gets or sets the flag to show request volumes.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            showRequestVolumes: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugShowViewerRequestVolume = val;
                    }
                }
            },
            /**
             * Gets or sets the maximum screen space error.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Number}
             * @default 16
             */
            maximumSSE : {
                default: 16,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.maximumScreenSpaceError = val;
                    }
                }
            },
            /**
             * Gets or sets the flag to enable dynamic SSE.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            dynamicSSE : {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.dynamicScreenSpaceError = val;
                    }
                }
            },
            /**
             * Gets or sets the dynamic SSE density.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Number}
             * @default 0.00278
             */
            dynamicSSEDensity : {
                default: 0.00278,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.dynamicScreenSpaceErrorDensity = val;
                    }
                }
            },
            /**
             * Gets or sets the dynamic SSE factor.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Number}
             * @default 4.0
             */
            dynamicSSEFactor : {
                default: 4.0,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.dynamicScreenSpaceErrorFactor = val;
                    }
                }
            },
            /**
             * Gets or sets the flag to enable performance display.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            performance : {
                default: false
            },
            /**
             * Gets or sets the flag to show the tile URL.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            showTileURL : {
                default: false
            },
            /**
             * Gets or sets the flag to ignore batch table.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            ignoreBatchTable : {
                default: false
            },

            /**
             * Gets or sets the flag to set stats text.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {String}
             * @default ''
             */
            statsText : {
                default: ''
            },
            /**
             * Gets or sets the flag to set pick stats text.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {String}
             * @default ''
             */
            pickStatsText : {
                default: ''
            }
        };
        this._subscriptions = {};
        createKnockoutBindings(this, tilesetOptions);
        createKnockoutBindings(this, {
            _tileset: {
                default: undefined
            },
            _feature: {
                default: undefined,
                subscribe: (function() {
                    var current = {
                        feature: undefined,
                        color: new Color()
                    };
                    return function(feature) {
                        if (current.feature !== feature) {
                            if (defined(current.feature)) {
                                // Restore original color to feature that is no longer selected
                                current.feature.color = Color.clone(current.color, current.feature.color);
                                current.feature = undefined;
                            }
                            if (defined(feature)) {
                                // Highlight new feature
                                current.feature = feature;
                                Color.clone(feature.color, current.color);
                                feature.color = Color.clone(that.highlightColor, feature.color);
                            }
                        }
                    };
                })()
            }
        });
        for (var name in tilesetOptions) {
            if (tilesetOptions.hasOwnProperty(name)) {
                // force an update on all options so default event listeners are created
                knockout.getObservable(that, name).valueHasMutated();
            }
        }

        this.tilesetURL = knockout.pureComputed(function() {
            if (!defined(that._tileset)) {
                return '';
            }
            return that._tileset.url;
        });
    }

    defineProperties(Cesium3DTilesInspectorViewModel.prototype, {
        /**
         * Gets or sets the tileset used for the view model
         * @memberof Cesium3DTilesInspectorViewModel.prototype
         *
         * @type {Cesium3DTileset}
         */
        tileset: {
            get: function() {
                return this._tileset;
            },
            set: function(tileset) {
                this._tileset = tileset;
                if (defined(this._statsLogger)) {
                    tileset.loadProgress.removeEventListener(this._statsLogger);
                    tileset.allTilesLoaded.removeEventListener(this._statsLogger);
                }
                if (defined(tileset)) {
                    this._statsLogger = this._updateStats.bind(this, false, false);
                    tileset.loadProgress.addEventListener(this._statsLogger);
                    tileset.allTilesLoaded.addEventListener(this._statsLogger);
                }
            }
        },

        /**
         * Gets the current feature of the view model
         * @memberof Cesium3DTilesInspectorViewModel.prototype
         *
         * @type {Object}
         */
        feature: {
            get: function() {
                return this._feature;
            }
        },

        /**
         * Gets the command to trim tile cache
         * @memberof Cesium3DTilesInspectorViewModel.prototype
         *
         * @type {Command}
         */
        trimTilesCache: {
            get: function() {
                var that = this;
                return createCommand(function() {
                    if (defined(that._tileset)) {
                        that._tileset.trimLoadedTiles();
                    }
                });
            }
        }
    });

    /**
     * Uodates the view model's stats text
     */
    Cesium3DTilesInspectorViewModel.prototype._updateStats = function(isPick, force) {
        var tileset = this._tileset;
        if (!defined(tileset)) {
            return;
        }

        var stats = tileset.statistics;
        var last = isPick ? stats.lastPick : stats.lastColor;
        var outputStats = (this.showStats && !isPick) || (this.showPickStats && isPick);
        var statsChanged =
            (last.visited !== stats.visited ||
             last.numberOfCommands !== stats.numberOfCommands ||
             last.selected !== tileset._selectedTiles.length ||
             last.numberOfAttemptedRequests !== stats.numberOfAttemptedRequests ||
             last.numberOfPendingRequests !== stats.numberOfPendingRequests ||
             last.numberProcessing !== stats.numberProcessing ||
             last.numberContentReady !== stats.numberContentReady ||
             last.numberTotal !== stats.numberTotal ||
             last.numberOfTilesStyled !== stats.numberOfTilesStyled ||
             last.numberOfFeaturesStyled !== stats.numberOfFeaturesStyled);

        if (outputStats && (force || statsChanged)) {
            // Since the pick pass uses a smaller frustum around the pixel of interest,
            // the stats will be different than the normal render pass.
            var s = isPick ? '[Pick ]: ' : '[Color]: ';
            s +=
                // --- Rendering stats
                'Visited: ' + stats.visited +
                // Number of commands returned is likely to be higher than the number of tiles selected
                // because of tiles that create multiple commands.
                ', Selected: ' + tileset._selectedTiles.length +
                // Number of commands executed is likely to be higher because of commands overlapping
                // multiple frustums.
                ', Commands: ' + stats.numberOfCommands +

                // --- Cache/loading stats
                ' | Requests: ' + stats.numberOfPendingRequests +
                ', Attempted: ' + stats.numberOfAttemptedRequests +
                ', Processing: ' + stats.numberProcessing +
                ', Content Ready: ' + stats.numberContentReady +
                // Total number of tiles includes tiles without content, so "Ready" may never reach
                // "Total."  Total also will increase when a tile with a tileset.json content is loaded.
                ', Total: ' + stats.numberTotal +

                // --- Styling stats
                ' | Tiles styled: ' + stats.numberOfTilesStyled +
                ', Features styled: ' + stats.numberOfFeaturesStyled;

            if (isPick) {
                this.pickStatsText = s;
            } else {
                this.statsText = s;
            }
        }

        last.visited = stats.visited;
        last.numberOfCommands = stats.numberOfCommands;
        last.selected = tileset._selectedTiles.length;
        last.numberOfAttemptedRequests = stats.numberOfAttemptedRequests;
        last.numberOfPendingRequests = stats.numberOfPendingRequests;
        last.numberProcessing = stats.numberProcessing;
        last.numberContentReady = stats.numberContentReady;
        last.numberTotal = stats.numberTotal;
        last.numberOfTilesStyled = stats.numberOfTilesStyled;
        last.numberOfFeaturesStyled = stats.numberOfFeaturesStyled;
    };

    /**
     * Updates the view model
     */
    Cesium3DTilesInspectorViewModel.prototype.update = function() {
        if (this.performance) {
            this._performanceDisplay.update();
        }
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    Cesium3DTilesInspectorViewModel.prototype.destroy = function() {
        this._eventHandler.destroy();
        for (var name in this._subscriptions) {
            if (this._subscriptions.hasOwnProperty(name)) {
                this._subscriptions[name].dispose();
            }
        }
        return destroyObject(this);
    };

    return Cesium3DTilesInspectorViewModel;
});
