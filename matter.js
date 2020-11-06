/**
* matter-js 0.12.0 by @liabru 2017-02-02
* http://brm.io/matter-js/
* License MIT
*/

/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2014 Liam Brummitt
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Matter = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
    /**
    * The `Matter.Body` module contains methods for creating and manipulating body models.
    * A `Matter.Body` is a rigid body that can be simulated by a `Matter.Engine`.
    * Factories for commonly used body configurations (such as rectangles, circles and other polygons) can be found in the module `Matter.Bodies`.
    *
    * See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
    
    * @class Body
    */
    
    var Body = {};
    
    module.exports = Body;
    
    var Vertices = _dereq_('../geometry/Vertices');
    var Vector = _dereq_('../geometry/Vector');
    var Sleeping = _dereq_('../core/Sleeping');
    var Render = _dereq_('../render/Render');
    var Common = _dereq_('../core/Common');
    var Bounds = _dereq_('../geometry/Bounds');
    var Axes = _dereq_('../geometry/Axes');
    
    (function() {
    
        Body._inertiaScale = 4;
        Body._nextCollidingGroupId = 1;
        Body._nextNonCollidingGroupId = -1;
        Body._nextCategory = 0x0001;
    
        /**
         * Creates a new rigid body model. The options parameter is an object that specifies any properties you wish to override the defaults.
         * All properties have default values, and many are pre-calculated automatically based on other properties.
         * Vertices must be specified in clockwise order.
         * See the properties section below for detailed information on what you can pass via the `options` object.
         * @method create
         * @param {} options
         * @return {body} body
         */
        Body.create = function(options) {
            var defaults = {
                id: Common.nextId(),
                type: 'body',
                label: 'Body',
                parts: [],
                plugin: {},
                angle: 0,
                vertices: Vertices.fromPath('L 0 0 L 40 0 L 40 40 L 0 40'),
                position: { x: 0, y: 0 },
                force: { x: 0, y: 0 },
                torque: 0,
                positionImpulse: { x: 0, y: 0 },
                constraintImpulse: { x: 0, y: 0, angle: 0 },
                totalContacts: 0,
                speed: 0,
                angularSpeed: 0,
                velocity: { x: 0, y: 0 },
                angularVelocity: 0,
                isSensor: false,
                isStatic: false,
                isSleeping: false,
                motion: 0,
                sleepThreshold: 60,
                density: 0.001,
                restitution: 0,
                friction: 0.1,
                frictionStatic: 0.5,
                frictionAir: 0.01,
                collisionFilter: {
                    category: 0x0001,
                    mask: 0xFFFFFFFF,
                    group: 0
                },
                slop: 0.05,
                timeScale: 1,
                render: {
                    visible: true,
                    opacity: 1,
                    sprite: {
                        xScale: 1,
                        yScale: 1,
                        xOffset: 0,
                        yOffset: 0
                    },
                    lineWidth: 0
                }
            };
    
            var body = Common.extend(defaults, options);
    
            _initProperties(body, options);
    
            return body;
        };
    
        /**
         * Returns the next unique group index for which bodies will collide.
         * If `isNonColliding` is `true`, returns the next unique group index for which bodies will _not_ collide.
         * See `body.collisionFilter` for more information.
         * @method nextGroup
         * @param {bool} [isNonColliding=false]
         * @return {Number} Unique group index
         */
        Body.nextGroup = function(isNonColliding) {
            if (isNonColliding)
                return Body._nextNonCollidingGroupId--;
    
            return Body._nextCollidingGroupId++;
        };
    
        /**
         * Returns the next unique category bitfield (starting after the initial default category `0x0001`).
         * There are 32 available. See `body.collisionFilter` for more information.
         * @method nextCategory
         * @return {Number} Unique category bitfield
         */
        Body.nextCategory = function() {
            Body._nextCategory = Body._nextCategory << 1;
            return Body._nextCategory;
        };
    
        /**
         * Initialises body properties.
         * @method _initProperties
         * @private
         * @param {body} body
         * @param {} [options]
         */
        var _initProperties = function(body, options) {
            options = options || {};
    
            // init required properties (order is important)
            Body.set(body, {
                bounds: body.bounds || Bounds.create(body.vertices),
                positionPrev: body.positionPrev || Vector.clone(body.position),
                anglePrev: body.anglePrev || body.angle,
                vertices: body.vertices,
                parts: body.parts || [body],
                isStatic: body.isStatic,
                isSleeping: body.isSleeping,
                parent: body.parent || body
            });
    
            Vertices.rotate(body.vertices, body.angle, body.position);
            Axes.rotate(body.axes, body.angle);
            Bounds.update(body.bounds, body.vertices, body.velocity);
    
            // allow options to override the automatically calculated properties
            Body.set(body, {
                axes: options.axes || body.axes,
                area: options.area || body.area,
                mass: options.mass || body.mass,
                inertia: options.inertia || body.inertia
            });
    
            // render properties
            var defaultFillStyle = (body.isStatic ? '#2e2b44' : Common.choose(['#006BA6', '#0496FF', '#FFBC42', '#D81159', '#8F2D56'])),
                defaultStrokeStyle = Common.shadeColor(defaultFillStyle, -20);
            body.render.fillStyle = body.render.fillStyle || defaultFillStyle;
            body.render.strokeStyle = body.render.strokeStyle || defaultStrokeStyle;
            body.render.sprite.xOffset += -(body.bounds.min.x - body.position.x) / (body.bounds.max.x - body.bounds.min.x);
            body.render.sprite.yOffset += -(body.bounds.min.y - body.position.y) / (body.bounds.max.y - body.bounds.min.y);
        };
    
        /**
         * Given a property and a value (or map of), sets the property(s) on the body, using the appropriate setter functions if they exist.
         * Prefer to use the actual setter functions in performance critical situations.
         * @method set
         * @param {body} body
         * @param {} settings A property name (or map of properties and values) to set on the body.
         * @param {} value The value to set if `settings` is a single property name.
         */
        Body.set = function(body, settings, value) {
            var property;
    
            if (typeof settings === 'string') {
                property = settings;
                settings = {};
                settings[property] = value;
            }
    
            for (property in settings) {
                value = settings[property];
    
                if (!settings.hasOwnProperty(property))
                    continue;
    
                switch (property) {
    
                case 'isStatic':
                    Body.setStatic(body, value);
                    break;
                case 'isSleeping':
                    Sleeping.set(body, value);
                    break;
                case 'mass':
                    Body.setMass(body, value);
                    break;
                case 'density':
                    Body.setDensity(body, value);
                    break;
                case 'inertia':
                    Body.setInertia(body, value);
                    break;
                case 'vertices':
                    Body.setVertices(body, value);
                    break;
                case 'position':
                    Body.setPosition(body, value);
                    break;
                case 'angle':
                    Body.setAngle(body, value);
                    break;
                case 'velocity':
                    Body.setVelocity(body, value);
                    break;
                case 'angularVelocity':
                    Body.setAngularVelocity(body, value);
                    break;
                case 'parts':
                    Body.setParts(body, value);
                    break;
                default:
                    body[property] = value;
    
                }
            }
        };
    
        /**
         * Sets the body as static, including isStatic flag and setting mass and inertia to Infinity.
         * @method setStatic
         * @param {body} body
         * @param {bool} isStatic
         */
        Body.setStatic = function(body, isStatic) {
            for (var i = 0; i < body.parts.length; i++) {
                var part = body.parts[i];
                part.isStatic = isStatic;
    
                if (isStatic) {
                    part._original = {
                        restitution: part.restitution,
                        friction: part.friction,
                        mass: part.mass,
                        inertia: part.inertia,
                        density: part.density,
                        inverseMass: part.inverseMass,
                        inverseInertia: part.inverseInertia
                    };
    
                    part.restitution = 0;
                    part.friction = 1;
                    part.mass = part.inertia = part.density = Infinity;
                    part.inverseMass = part.inverseInertia = 0;
    
                    part.positionPrev.x = part.position.x;
                    part.positionPrev.y = part.position.y;
                    part.anglePrev = part.angle;
                    part.angularVelocity = 0;
                    part.speed = 0;
                    part.angularSpeed = 0;
                    part.motion = 0;
                } else if (part._original) {
                    part.restitution = part._original.restitution;
                    part.friction = part._original.friction;
                    part.mass = part._original.mass;
                    part.inertia = part._original.inertia;
                    part.density = part._original.density;
                    part.inverseMass = part._original.inverseMass;
                    part.inverseInertia = part._original.inverseInertia;
    
                    delete part._original;
                }
            }
        };
    
        /**
         * Sets the mass of the body. Inverse mass and density are automatically updated to reflect the change.
         * @method setMass
         * @param {body} body
         * @param {number} mass
         */
        Body.setMass = function(body, mass) {
            body.mass = mass;
            body.inverseMass = 1 / body.mass;
            body.density = body.mass / body.area;
        };
    
        /**
         * Sets the density of the body. Mass is automatically updated to reflect the change.
         * @method setDensity
         * @param {body} body
         * @param {number} density
         */
        Body.setDensity = function(body, density) {
            Body.setMass(body, density * body.area);
            body.density = density;
        };
    
        /**
         * Sets the moment of inertia (i.e. second moment of area) of the body of the body. 
         * Inverse inertia is automatically updated to reflect the change. Mass is not changed.
         * @method setInertia
         * @param {body} body
         * @param {number} inertia
         */
        Body.setInertia = function(body, inertia) {
            body.inertia = inertia;
            body.inverseInertia = 1 / body.inertia;
        };
    
        /**
         * Sets the body's vertices and updates body properties accordingly, including inertia, area and mass (with respect to `body.density`).
         * Vertices will be automatically transformed to be orientated around their centre of mass as the origin.
         * They are then automatically translated to world space based on `body.position`.
         *
         * The `vertices` argument should be passed as an array of `Matter.Vector` points (or a `Matter.Vertices` array).
         * Vertices must form a convex hull, concave hulls are not supported.
         *
         * @method setVertices
         * @param {body} body
         * @param {vector[]} vertices
         */
        Body.setVertices = function(body, vertices) {
            // change vertices
            if (vertices[0].body === body) {
                body.vertices = vertices;
            } else {
                body.vertices = Vertices.create(vertices, body);
            }
    
            // update properties
            body.axes = Axes.fromVertices(body.vertices);
            body.area = Vertices.area(body.vertices);
            Body.setMass(body, body.density * body.area);
    
            // orient vertices around the centre of mass at origin (0, 0)
            var centre = Vertices.centre(body.vertices);
            Vertices.translate(body.vertices, centre, -1);
    
            // update inertia while vertices are at origin (0, 0)
            Body.setInertia(body, Body._inertiaScale * Vertices.inertia(body.vertices, body.mass));
    
            // update geometry
            Vertices.translate(body.vertices, body.position);
            Bounds.update(body.bounds, body.vertices, body.velocity);
        };
    
        /**
         * Sets the parts of the `body` and updates mass, inertia and centroid.
         * Each part will have its parent set to `body`.
         * By default the convex hull will be automatically computed and set on `body`, unless `autoHull` is set to `false.`
         * Note that this method will ensure that the first part in `body.parts` will always be the `body`.
         * @method setParts
         * @param {body} body
         * @param [body] parts
         * @param {bool} [autoHull=true]
         */
        Body.setParts = function(body, parts, autoHull) {
            var i;
    
            // add all the parts, ensuring that the first part is always the parent body
            parts = parts.slice(0);
            body.parts.length = 0;
            body.parts.push(body);
            body.parent = body;
    
            for (i = 0; i < parts.length; i++) {
                var part = parts[i];
                if (part !== body) {
                    part.parent = body;
                    body.parts.push(part);
                }
            }
    
            if (body.parts.length === 1)
                return;
    
            autoHull = typeof autoHull !== 'undefined' ? autoHull : true;
    
            // find the convex hull of all parts to set on the parent body
            if (autoHull) {
                var vertices = [];
                for (i = 0; i < parts.length; i++) {
                    vertices = vertices.concat(parts[i].vertices);
                }
    
                Vertices.clockwiseSort(vertices);
    
                var hull = Vertices.hull(vertices),
                    hullCentre = Vertices.centre(hull);
    
                Body.setVertices(body, hull);
                Vertices.translate(body.vertices, hullCentre);
            }
    
            // sum the properties of all compound parts of the parent body
            var total = _totalProperties(body);
    
            body.area = total.area;
            body.parent = body;
            body.position.x = total.centre.x;
            body.position.y = total.centre.y;
            body.positionPrev.x = total.centre.x;
            body.positionPrev.y = total.centre.y;
    
            Body.setMass(body, total.mass);
            Body.setInertia(body, total.inertia);
            Body.setPosition(body, total.centre);
        };
    
        /**
         * Sets the position of the body instantly. Velocity, angle, force etc. are unchanged.
         * @method setPosition
         * @param {body} body
         * @param {vector} position
         */
        Body.setPosition = function(body, position) {
            var delta = Vector.sub(position, body.position);
            body.positionPrev.x += delta.x;
            body.positionPrev.y += delta.y;
    
            for (var i = 0; i < body.parts.length; i++) {
                var part = body.parts[i];
                part.position.x += delta.x;
                part.position.y += delta.y;
                Vertices.translate(part.vertices, delta);
                Bounds.update(part.bounds, part.vertices, body.velocity);
            }
        };
    
        /**
         * Sets the angle of the body instantly. Angular velocity, position, force etc. are unchanged.
         * @method setAngle
         * @param {body} body
         * @param {number} angle
         */
        Body.setAngle = function(body, angle) {
            var delta = angle - body.angle;
            body.anglePrev += delta;
    
            for (var i = 0; i < body.parts.length; i++) {
                var part = body.parts[i];
                part.angle += delta;
                Vertices.rotate(part.vertices, delta, body.position);
                Axes.rotate(part.axes, delta);
                Bounds.update(part.bounds, part.vertices, body.velocity);
                if (i > 0) {
                    Vector.rotateAbout(part.position, delta, body.position, part.position);
                }
            }
        };
    
        /**
         * Sets the linear velocity of the body instantly. Position, angle, force etc. are unchanged. See also `Body.applyForce`.
         * @method setVelocity
         * @param {body} body
         * @param {vector} velocity
         */
        Body.setVelocity = function(body, velocity) {
            body.positionPrev.x = body.position.x - velocity.x;
            body.positionPrev.y = body.position.y - velocity.y;
            body.velocity.x = velocity.x;
            body.velocity.y = velocity.y;
            body.speed = Vector.magnitude(body.velocity);
        };
    
        /**
         * Sets the angular velocity of the body instantly. Position, angle, force etc. are unchanged. See also `Body.applyForce`.
         * @method setAngularVelocity
         * @param {body} body
         * @param {number} velocity
         */
        Body.setAngularVelocity = function(body, velocity) {
            body.anglePrev = body.angle - velocity;
            body.angularVelocity = velocity;
            body.angularSpeed = Math.abs(body.angularVelocity);
        };
    
        /**
         * Moves a body by a given vector relative to its current position, without imparting any velocity.
         * @method translate
         * @param {body} body
         * @param {vector} translation
         */
        Body.translate = function(body, translation) {
            Body.setPosition(body, Vector.add(body.position, translation));
        };
    
        /**
         * Rotates a body by a given angle relative to its current angle, without imparting any angular velocity.
         * @method rotate
         * @param {body} body
         * @param {number} rotation
         */
        Body.rotate = function(body, rotation) {
            Body.setAngle(body, body.angle + rotation);
        };
    
        /**
         * Scales the body, including updating physical properties (mass, area, axes, inertia), from a world-space point (default is body centre).
         * @method scale
         * @param {body} body
         * @param {number} scaleX
         * @param {number} scaleY
         * @param {vector} [point]
         */
        Body.scale = function(body, scaleX, scaleY, point) {
            for (var i = 0; i < body.parts.length; i++) {
                var part = body.parts[i];
    
                // scale vertices
                Vertices.scale(part.vertices, scaleX, scaleY, body.position);
    
                // update properties
                part.axes = Axes.fromVertices(part.vertices);
    
                if (!body.isStatic) {
                    part.area = Vertices.area(part.vertices);
                    Body.setMass(part, body.density * part.area);
    
                    // update inertia (requires vertices to be at origin)
                    Vertices.translate(part.vertices, { x: -part.position.x, y: -part.position.y });
                    Body.setInertia(part, Vertices.inertia(part.vertices, part.mass));
                    Vertices.translate(part.vertices, { x: part.position.x, y: part.position.y });
                }
    
                // update bounds
                Bounds.update(part.bounds, part.vertices, body.velocity);
            }
    
            // handle circles
            if (body.circleRadius) { 
                if (scaleX === scaleY) {
                    body.circleRadius *= scaleX;
                } else {
                    // body is no longer a circle
                    body.circleRadius = null;
                }
            }
    
            if (!body.isStatic) {
                var total = _totalProperties(body);
                body.area = total.area;
                Body.setMass(body, total.mass);
                Body.setInertia(body, total.inertia);
            }
        };
    
        /**
         * Performs a simulation step for the given `body`, including updating position and angle using Verlet integration.
         * @method update
         * @param {body} body
         * @param {number} deltaTime
         * @param {number} timeScale
         * @param {number} correction
         */
        Body.update = function(body, deltaTime, timeScale, correction) {
            var deltaTimeSquared = Math.pow(deltaTime * timeScale * body.timeScale, 2);
    
            // from the previous step
            var frictionAir = 1 - body.frictionAir * timeScale * body.timeScale,
                velocityPrevX = body.position.x - body.positionPrev.x,
                velocityPrevY = body.position.y - body.positionPrev.y;
    
            // update velocity with Verlet integration
            body.velocity.x = (velocityPrevX * frictionAir * correction) + (body.force.x / body.mass) * deltaTimeSquared;
            body.velocity.y = (velocityPrevY * frictionAir * correction) + (body.force.y / body.mass) * deltaTimeSquared;
    
            body.positionPrev.x = body.position.x;
            body.positionPrev.y = body.position.y;
            body.position.x += body.velocity.x;
            body.position.y += body.velocity.y;
    
            // update angular velocity with Verlet integration
            body.angularVelocity = ((body.angle - body.anglePrev) * frictionAir * correction) + (body.torque / body.inertia) * deltaTimeSquared;
            body.anglePrev = body.angle;
            body.angle += body.angularVelocity;
    
            // track speed and acceleration
            body.speed = Vector.magnitude(body.velocity);
            body.angularSpeed = Math.abs(body.angularVelocity);
    
            // transform the body geometry
            for (var i = 0; i < body.parts.length; i++) {
                var part = body.parts[i];
    
                Vertices.translate(part.vertices, body.velocity);
                
                if (i > 0) {
                    part.position.x += body.velocity.x;
                    part.position.y += body.velocity.y;
                }
    
                if (body.angularVelocity !== 0) {
                    Vertices.rotate(part.vertices, body.angularVelocity, body.position);
                    Axes.rotate(part.axes, body.angularVelocity);
                    if (i > 0) {
                        Vector.rotateAbout(part.position, body.angularVelocity, body.position, part.position);
                    }
                }
    
                Bounds.update(part.bounds, part.vertices, body.velocity);
            }
        };
    
        /**
         * Applies a force to a body from a given world-space position, including resulting torque.
         * @method applyForce
         * @param {body} body
         * @param {vector} position
         * @param {vector} force
         */
        Body.applyForce = function(body, position, force) {
            body.force.x += force.x;
            body.force.y += force.y;
            var offset = { x: position.x - body.position.x, y: position.y - body.position.y };
            body.torque += offset.x * force.y - offset.y * force.x;
        };
    
        /**
         * Returns the sums of the properties of all compound parts of the parent body.
         * @method _totalProperties
         * @private
         * @param {body} body
         * @return {}
         */
        var _totalProperties = function(body) {
            // https://ecourses.ou.edu/cgi-bin/ebook.cgi?doc=&topic=st&chap_sec=07.2&page=theory
            // http://output.to/sideway/default.asp?qno=121100087
    
            var properties = {
                mass: 0,
                area: 0,
                inertia: 0,
                centre: { x: 0, y: 0 }
            };
    
            // sum the properties of all compound parts of the parent body
            for (var i = body.parts.length === 1 ? 0 : 1; i < body.parts.length; i++) {
                var part = body.parts[i];
                properties.mass += part.mass;
                properties.area += part.area;
                properties.inertia += part.inertia;
                properties.centre = Vector.add(properties.centre, 
                                               Vector.mult(part.position, part.mass !== Infinity ? part.mass : 1));
            }
    
            properties.centre = Vector.div(properties.centre, 
                                           properties.mass !== Infinity ? properties.mass : body.parts.length);
    
            return properties;
        };
    
        /*
        *
        *  Events Documentation
        *
        */
    
        /**
        * Fired when a body starts sleeping (where `this` is the body).
        *
        * @event sleepStart
        * @this {body} The body that has started sleeping
        * @param {} event An event object
        * @param {} event.source The source object of the event
        * @param {} event.name The name of the event
        */
    
        /**
        * Fired when a body ends sleeping (where `this` is the body).
        *
        * @event sleepEnd
        * @this {body} The body that has ended sleeping
        * @param {} event An event object
        * @param {} event.source The source object of the event
        * @param {} event.name The name of the event
        */
    
        /*
        *
        *  Properties Documentation
        *
        */
    
        /**
         * An integer `Number` uniquely identifying number generated in `Body.create` by `Common.nextId`.
         *
         * @property id
         * @type number
         */
    
        /**
         * A `String` denoting the type of object.
         *
         * @property type
         * @type string
         * @default "body"
         * @readOnly
         */
    
        /**
         * An arbitrary `String` name to help the user identify and manage bodies.
         *
         * @property label
         * @type string
         * @default "Body"
         */
    
        /**
         * An array of bodies that make up this body. 
         * The first body in the array must always be a self reference to the current body instance.
         * All bodies in the `parts` array together form a single rigid compound body.
         * Parts are allowed to overlap, have gaps or holes or even form concave bodies.
         * Parts themselves should never be added to a `World`, only the parent body should be.
         * Use `Body.setParts` when setting parts to ensure correct updates of all properties.
         *
         * @property parts
         * @type body[]
         */
    
        /**
         * An object reserved for storing plugin-specific properties.
         *
         * @property plugin
         * @type {}
         */
    
        /**
         * A self reference if the body is _not_ a part of another body.
         * Otherwise this is a reference to the body that this is a part of.
         * See `body.parts`.
         *
         * @property parent
         * @type body
         */
    
        /**
         * A `Number` specifying the angle of the body, in radians.
         *
         * @property angle
         * @type number
         * @default 0
         */
    
        /**
         * An array of `Vector` objects that specify the convex hull of the rigid body.
         * These should be provided about the origin `(0, 0)`. E.g.
         *
         *     [{ x: 0, y: 0 }, { x: 25, y: 50 }, { x: 50, y: 0 }]
         *
         * When passed via `Body.create`, the vertices are translated relative to `body.position` (i.e. world-space, and constantly updated by `Body.update` during simulation).
         * The `Vector` objects are also augmented with additional properties required for efficient collision detection. 
         *
         * Other properties such as `inertia` and `bounds` are automatically calculated from the passed vertices (unless provided via `options`).
         * Concave hulls are not currently supported. The module `Matter.Vertices` contains useful methods for working with vertices.
         *
         * @property vertices
         * @type vector[]
         */
    
        /**
         * A `Vector` that specifies the current world-space position of the body.
         *
         * @property position
         * @type vector
         * @default { x: 0, y: 0 }
         */
    
        /**
         * A `Vector` that specifies the force to apply in the current step. It is zeroed after every `Body.update`. See also `Body.applyForce`.
         *
         * @property force
         * @type vector
         * @default { x: 0, y: 0 }
         */
    
        /**
         * A `Number` that specifies the torque (turning force) to apply in the current step. It is zeroed after every `Body.update`.
         *
         * @property torque
         * @type number
         * @default 0
         */
    
        /**
         * A `Number` that _measures_ the current speed of the body after the last `Body.update`. It is read-only and always positive (it's the magnitude of `body.velocity`).
         *
         * @readOnly
         * @property speed
         * @type number
         * @default 0
         */
    
        /**
         * A `Number` that _measures_ the current angular speed of the body after the last `Body.update`. It is read-only and always positive (it's the magnitude of `body.angularVelocity`).
         *
         * @readOnly
         * @property angularSpeed
         * @type number
         * @default 0
         */
    
        /**
         * A `Vector` that _measures_ the current velocity of the body after the last `Body.update`. It is read-only. 
         * If you need to modify a body's velocity directly, you should either apply a force or simply change the body's `position` (as the engine uses position-Verlet integration).
         *
         * @readOnly
         * @property velocity
         * @type vector
         * @default { x: 0, y: 0 }
         */
    
        /**
         * A `Number` that _measures_ the current angular velocity of the body after the last `Body.update`. It is read-only. 
         * If you need to modify a body's angular velocity directly, you should apply a torque or simply change the body's `angle` (as the engine uses position-Verlet integration).
         *
         * @readOnly
         * @property angularVelocity
         * @type number
         * @default 0
         */
    
        /**
         * A flag that indicates whether a body is considered static. A static body can never change position or angle and is completely fixed.
         * If you need to set a body as static after its creation, you should use `Body.setStatic` as this requires more than just setting this flag.
         *
         * @property isStatic
         * @type boolean
         * @default false
         */
    
        /**
         * A flag that indicates whether a body is a sensor. Sensor triggers collision events, but doesn't react with colliding body physically.
         *
         * @property isSensor
         * @type boolean
         * @default false
         */
    
        /**
         * A flag that indicates whether the body is considered sleeping. A sleeping body acts similar to a static body, except it is only temporary and can be awoken.
         * If you need to set a body as sleeping, you should use `Sleeping.set` as this requires more than just setting this flag.
         *
         * @property isSleeping
         * @type boolean
         * @default false
         */
    
        /**
         * A `Number` that _measures_ the amount of movement a body currently has (a combination of `speed` and `angularSpeed`). It is read-only and always positive.
         * It is used and updated by the `Matter.Sleeping` module during simulation to decide if a body has come to rest.
         *
         * @readOnly
         * @property motion
         * @type number
         * @default 0
         */
    
        /**
         * A `Number` that defines the number of updates in which this body must have near-zero velocity before it is set as sleeping by the `Matter.Sleeping` module (if sleeping is enabled by the engine).
         *
         * @property sleepThreshold
         * @type number
         * @default 60
         */
    
        /**
         * A `Number` that defines the density of the body, that is its mass per unit area.
         * If you pass the density via `Body.create` the `mass` property is automatically calculated for you based on the size (area) of the object.
         * This is generally preferable to simply setting mass and allows for more intuitive definition of materials (e.g. rock has a higher density than wood).
         *
         * @property density
         * @type number
         * @default 0.001
         */
    
        /**
         * A `Number` that defines the mass of the body, although it may be more appropriate to specify the `density` property instead.
         * If you modify this value, you must also modify the `body.inverseMass` property (`1 / mass`).
         *
         * @property mass
         * @type number
         */
    
        /**
         * A `Number` that defines the inverse mass of the body (`1 / mass`).
         * If you modify this value, you must also modify the `body.mass` property.
         *
         * @property inverseMass
         * @type number
         */
    
        /**
         * A `Number` that defines the moment of inertia (i.e. second moment of area) of the body.
         * It is automatically calculated from the given convex hull (`vertices` array) and density in `Body.create`.
         * If you modify this value, you must also modify the `body.inverseInertia` property (`1 / inertia`).
         *
         * @property inertia
         * @type number
         */
    
        /**
         * A `Number` that defines the inverse moment of inertia of the body (`1 / inertia`).
         * If you modify this value, you must also modify the `body.inertia` property.
         *
         * @property inverseInertia
         * @type number
         */
    
        /**
         * A `Number` that defines the restitution (elasticity) of the body. The value is always positive and is in the range `(0, 1)`.
         * A value of `0` means collisions may be perfectly inelastic and no bouncing may occur. 
         * A value of `0.8` means the body may bounce back with approximately 80% of its kinetic energy.
         * Note that collision response is based on _pairs_ of bodies, and that `restitution` values are _combined_ with the following formula:
         *
         *     Math.max(bodyA.restitution, bodyB.restitution)
         *
         * @property restitution
         * @type number
         * @default 0
         */
    
        /**
         * A `Number` that defines the friction of the body. The value is always positive and is in the range `(0, 1)`.
         * A value of `0` means that the body may slide indefinitely.
         * A value of `1` means the body may come to a stop almost instantly after a force is applied.
         *
         * The effects of the value may be non-linear. 
         * High values may be unstable depending on the body.
         * The engine uses a Coulomb friction model including static and kinetic friction.
         * Note that collision response is based on _pairs_ of bodies, and that `friction` values are _combined_ with the following formula:
         *
         *     Math.min(bodyA.friction, bodyB.friction)
         *
         * @property friction
         * @type number
         * @default 0.1
         */
    
        /**
         * A `Number` that defines the static friction of the body (in the Coulomb friction model). 
         * A value of `0` means the body will never 'stick' when it is nearly stationary and only dynamic `friction` is used.
         * The higher the value (e.g. `10`), the more force it will take to initially get the body moving when nearly stationary.
         * This value is multiplied with the `friction` property to make it easier to change `friction` and maintain an appropriate amount of static friction.
         *
         * @property frictionStatic
         * @type number
         * @default 0.5
         */
    
        /**
         * A `Number` that defines the air friction of the body (air resistance). 
         * A value of `0` means the body will never slow as it moves through space.
         * The higher the value, the faster a body slows when moving through space.
         * The effects of the value are non-linear. 
         *
         * @property frictionAir
         * @type number
         * @default 0.01
         */
    
        /**
         * An `Object` that specifies the collision filtering properties of this body.
         *
         * Collisions between two bodies will obey the following rules:
         * - If the two bodies have the same non-zero value of `collisionFilter.group`,
         *   they will always collide if the value is positive, and they will never collide
         *   if the value is negative.
         * - If the two bodies have different values of `collisionFilter.group` or if one
         *   (or both) of the bodies has a value of 0, then the category/mask rules apply as follows:
         *
         * Each body belongs to a collision category, given by `collisionFilter.category`. This
         * value is used as a bit field and the category should have only one bit set, meaning that
         * the value of this property is a power of two in the range [1, 2^31]. Thus, there are 32
         * different collision categories available.
         *
         * Each body also defines a collision bitmask, given by `collisionFilter.mask` which specifies
         * the categories it collides with (the value is the bitwise AND value of all these categories).
         *
         * Using the category/mask rules, two bodies `A` and `B` collide if each includes the other's
         * category in its mask, i.e. `(categoryA & maskB) !== 0` and `(categoryB & maskA) !== 0`
         * are both true.
         *
         * @property collisionFilter
         * @type object
         */
    
        /**
         * An Integer `Number`, that specifies the collision group this body belongs to.
         * See `body.collisionFilter` for more information.
         *
         * @property collisionFilter.group
         * @type object
         * @default 0
         */
    
        /**
         * A bit field that specifies the collision category this body belongs to.
         * The category value should have only one bit set, for example `0x0001`.
         * This means there are up to 32 unique collision categories available.
         * See `body.collisionFilter` for more information.
         *
         * @property collisionFilter.category
         * @type object
         * @default 1
         */
    
        /**
         * A bit mask that specifies the collision categories this body may collide with.
         * See `body.collisionFilter` for more information.
         *
         * @property collisionFilter.mask
         * @type object
         * @default -1
         */
    
        /**
         * A `Number` that specifies a tolerance on how far a body is allowed to 'sink' or rotate into other bodies.
         * Avoid changing this value unless you understand the purpose of `slop` in physics engines.
         * The default should generally suffice, although very large bodies may require larger values for stable stacking.
         *
         * @property slop
         * @type number
         * @default 0.05
         */
    
        /**
         * A `Number` that allows per-body time scaling, e.g. a force-field where bodies inside are in slow-motion, while others are at full speed.
         *
         * @property timeScale
         * @type number
         * @default 1
         */
    
        /**
         * An `Object` that defines the rendering properties to be consumed by the module `Matter.Render`.
         *
         * @property render
         * @type object
         */
    
        /**
         * A flag that indicates if the body should be rendered.
         *
         * @property render.visible
         * @type boolean
         * @default true
         */
    
        /**
         * Sets the opacity to use when rendering.
         *
         * @property render.opacity
         * @type number
         * @default 1
        */
    
        /**
         * An `Object` that defines the sprite properties to use when rendering, if any.
         *
         * @property render.sprite
         * @type object
         */
    
        /**
         * An `String` that defines the path to the image to use as the sprite texture, if any.
         *
         * @property render.sprite.texture
         * @type string
         */
         
        /**
         * A `Number` that defines the scaling in the x-axis for the sprite, if any.
         *
         * @property render.sprite.xScale
         * @type number
         * @default 1
         */
    
        /**
         * A `Number` that defines the scaling in the y-axis for the sprite, if any.
         *
         * @property render.sprite.yScale
         * @type number
         * @default 1
         */
    
         /**
          * A `Number` that defines the offset in the x-axis for the sprite (normalised by texture width).
          *
          * @property render.sprite.xOffset
          * @type number
          * @default 0
          */
    
         /**
          * A `Number` that defines the offset in the y-axis for the sprite (normalised by texture height).
          *
          * @property render.sprite.yOffset
          * @type number
          * @default 0
          */
    
        /**
         * A `Number` that defines the line width to use when rendering the body outline (if a sprite is not defined).
         * A value of `0` means no outline will be rendered.
         *
         * @property render.lineWidth
         * @type number
         * @default 1.5
         */
    
        /**
         * A `String` that defines the fill style to use when rendering the body (if a sprite is not defined).
         * It is the same as when using a canvas, so it accepts CSS style property values.
         *
         * @property render.fillStyle
         * @type string
         * @default a random colour
         */
    
        /**
         * A `String` that defines the stroke style to use when rendering the body outline (if a sprite is not defined).
         * It is the same as when using a canvas, so it accepts CSS style property values.
         *
         * @property render.strokeStyle
         * @type string
         * @default a random colour
         */
    
        /**
         * An array of unique axis vectors (edge normals) used for collision detection.
         * These are automatically calculated from the given convex hull (`vertices` array) in `Body.create`.
         * They are constantly updated by `Body.update` during the simulation.
         *
         * @property axes
         * @type vector[]
         */
         
        /**
         * A `Number` that _measures_ the area of the body's convex hull, calculated at creation by `Body.create`.
         *
         * @property area
         * @type string
         * @default 
         */
    
        /**
         * A `Bounds` object that defines the AABB region for the body.
         * It is automatically calculated from the given convex hull (`vertices` array) in `Body.create` and constantly updated by `Body.update` during simulation.
         *
         * @property bounds
         * @type bounds
         */
    
    })();
    
    },{"../core/Common":14,"../core/Sleeping":22,"../geometry/Axes":25,"../geometry/Bounds":26,"../geometry/Vector":28,"../geometry/Vertices":29,"../render/Render":31}],2:[function(_dereq_,module,exports){
    /**
    * The `Matter.Composite` module contains methods for creating and manipulating composite bodies.
    * A composite body is a collection of `Matter.Body`, `Matter.Constraint` and other `Matter.Composite`, therefore composites form a tree structure.
    * It is important to use the functions in this module to modify composites, rather than directly modifying their properties.
    * Note that the `Matter.World` object is also a type of `Matter.Composite` and as such all composite methods here can also operate on a `Matter.World`.
    *
    * See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
    *
    * @class Composite
    */
    
    var Composite = {};
    
    module.exports = Composite;
    
    var Events = _dereq_('../core/Events');
    var Common = _dereq_('../core/Common');
    var Body = _dereq_('./Body');
    
    (function() {
    
        /**
         * Creates a new composite. The options parameter is an object that specifies any properties you wish to override the defaults.
         * See the properites section below for detailed information on what you can pass via the `options` object.
         * @method create
         * @param {} [options]
         * @return {composite} A new composite
         */
        Composite.create = function(options) {
            return Common.extend({ 
                id: Common.nextId(),
                type: 'composite',
                parent: null,
                isModified: false,
                bodies: [], 
                constraints: [], 
                composites: [],
                label: 'Composite',
                plugin: {}
            }, options);
        };
    
        /**
         * Sets the composite's `isModified` flag. 
         * If `updateParents` is true, all parents will be set (default: false).
         * If `updateChildren` is true, all children will be set (default: false).
         * @method setModified
         * @param {composite} composite
         * @param {boolean} isModified
         * @param {boolean} [updateParents=false]
         * @param {boolean} [updateChildren=false]
         */
        Composite.setModified = function(composite, isModified, updateParents, updateChildren) {
            composite.isModified = isModified;
    
            if (updateParents && composite.parent) {
                Composite.setModified(composite.parent, isModified, updateParents, updateChildren);
            }
    
            if (updateChildren) {
                for(var i = 0; i < composite.composites.length; i++) {
                    var childComposite = composite.composites[i];
                    Composite.setModified(childComposite, isModified, updateParents, updateChildren);
                }
            }
        };
    
        /**
         * Generic add function. Adds one or many body(s), constraint(s) or a composite(s) to the given composite.
         * Triggers `beforeAdd` and `afterAdd` events on the `composite`.
         * @method add
         * @param {composite} composite
         * @param {} object
         * @return {composite} The original composite with the objects added
         */
        Composite.add = function(composite, object) {
            var objects = [].concat(object);
    
            Events.trigger(composite, 'beforeAdd', { object: object });
    
            for (var i = 0; i < objects.length; i++) {
                var obj = objects[i];
    
                switch (obj.type) {
    
                case 'body':
                    // skip adding compound parts
                    if (obj.parent !== obj) {
                        Common.warn('Composite.add: skipped adding a compound body part (you must add its parent instead)');
                        break;
                    }
    
                    Composite.addBody(composite, obj);
                    break;
                case 'constraint':
                    Composite.addConstraint(composite, obj);
                    break;
                case 'composite':
                    Composite.addComposite(composite, obj);
                    break;
                case 'mouseConstraint':
                    Composite.addConstraint(composite, obj.constraint);
                    break;
    
                }
            }
    
            Events.trigger(composite, 'afterAdd', { object: object });
    
            return composite;
        };
    
        /**
         * Generic remove function. Removes one or many body(s), constraint(s) or a composite(s) to the given composite.
         * Optionally searching its children recursively.
         * Triggers `beforeRemove` and `afterRemove` events on the `composite`.
         * @method remove
         * @param {composite} composite
         * @param {} object
         * @param {boolean} [deep=false]
         * @return {composite} The original composite with the objects removed
         */
        Composite.remove = function(composite, object, deep) {
            var objects = [].concat(object);
    
            Events.trigger(composite, 'beforeRemove', { object: object });
    
            for (var i = 0; i < objects.length; i++) {
                var obj = objects[i];
    
                switch (obj.type) {
    
                case 'body':
                    Composite.removeBody(composite, obj, deep);
                    break;
                case 'constraint':
                    Composite.removeConstraint(composite, obj, deep);
                    break;
                case 'composite':
                    Composite.removeComposite(composite, obj, deep);
                    break;
                case 'mouseConstraint':
                    Composite.removeConstraint(composite, obj.constraint);
                    break;
    
                }
            }
    
            Events.trigger(composite, 'afterRemove', { object: object });
    
            return composite;
        };
    
        /**
         * Adds a composite to the given composite.
         * @private
         * @method addComposite
         * @param {composite} compositeA
         * @param {composite} compositeB
         * @return {composite} The original compositeA with the objects from compositeB added
         */
        Composite.addComposite = function(compositeA, compositeB) {
            compositeA.composites.push(compositeB);
            compositeB.parent = compositeA;
            Composite.setModified(compositeA, true, true, false);
            return compositeA;
        };
    
        /**
         * Removes a composite from the given composite, and optionally searching its children recursively.
         * @private
         * @method removeComposite
         * @param {composite} compositeA
         * @param {composite} compositeB
         * @param {boolean} [deep=false]
         * @return {composite} The original compositeA with the composite removed
         */
        Composite.removeComposite = function(compositeA, compositeB, deep) {
            var position = Common.indexOf(compositeA.composites, compositeB);
            if (position !== -1) {
                Composite.removeCompositeAt(compositeA, position);
                Composite.setModified(compositeA, true, true, false);
            }
    
            if (deep) {
                for (var i = 0; i < compositeA.composites.length; i++){
                    Composite.removeComposite(compositeA.composites[i], compositeB, true);
                }
            }
    
            return compositeA;
        };
    
        /**
         * Removes a composite from the given composite.
         * @private
         * @method removeCompositeAt
         * @param {composite} composite
         * @param {number} position
         * @return {composite} The original composite with the composite removed
         */
        Composite.removeCompositeAt = function(composite, position) {
            composite.composites.splice(position, 1);
            Composite.setModified(composite, true, true, false);
            return composite;
        };
    
        /**
         * Adds a body to the given composite.
         * @private
         * @method addBody
         * @param {composite} composite
         * @param {body} body
         * @return {composite} The original composite with the body added
         */
        Composite.addBody = function(composite, body) {
            composite.bodies.push(body);
            Composite.setModified(composite, true, true, false);
            return composite;
        };
    
        /**
         * Removes a body from the given composite, and optionally searching its children recursively.
         * @private
         * @method removeBody
         * @param {composite} composite
         * @param {body} body
         * @param {boolean} [deep=false]
         * @return {composite} The original composite with the body removed
         */
        Composite.removeBody = function(composite, body, deep) {
            var position = Common.indexOf(composite.bodies, body);
            if (position !== -1) {
                Composite.removeBodyAt(composite, position);
                Composite.setModified(composite, true, true, false);
            }
    
            if (deep) {
                for (var i = 0; i < composite.composites.length; i++){
                    Composite.removeBody(composite.composites[i], body, true);
                }
            }
    
            return composite;
        };
    
        /**
         * Removes a body from the given composite.
         * @private
         * @method removeBodyAt
         * @param {composite} composite
         * @param {number} position
         * @return {composite} The original composite with the body removed
         */
        Composite.removeBodyAt = function(composite, position) {
            composite.bodies.splice(position, 1);
            Composite.setModified(composite, true, true, false);
            return composite;
        };
    
        /**
         * Adds a constraint to the given composite.
         * @private
         * @method addConstraint
         * @param {composite} composite
         * @param {constraint} constraint
         * @return {composite} The original composite with the constraint added
         */
        Composite.addConstraint = function(composite, constraint) {
            composite.constraints.push(constraint);
            Composite.setModified(composite, true, true, false);
            return composite;
        };
    
        /**
         * Removes a constraint from the given composite, and optionally searching its children recursively.
         * @private
         * @method removeConstraint
         * @param {composite} composite
         * @param {constraint} constraint
         * @param {boolean} [deep=false]
         * @return {composite} The original composite with the constraint removed
         */
        Composite.removeConstraint = function(composite, constraint, deep) {
            var position = Common.indexOf(composite.constraints, constraint);
            if (position !== -1) {
                Composite.removeConstraintAt(composite, position);
            }
    
            if (deep) {
                for (var i = 0; i < composite.composites.length; i++){
                    Composite.removeConstraint(composite.composites[i], constraint, true);
                }
            }
    
            return composite;
        };
    
        /**
         * Removes a body from the given composite.
         * @private
         * @method removeConstraintAt
         * @param {composite} composite
         * @param {number} position
         * @return {composite} The original composite with the constraint removed
         */
        Composite.removeConstraintAt = function(composite, position) {
            composite.constraints.splice(position, 1);
            Composite.setModified(composite, true, true, false);
            return composite;
        };
    
        /**
         * Removes all bodies, constraints and composites from the given composite.
         * Optionally clearing its children recursively.
         * @method clear
         * @param {composite} composite
         * @param {boolean} keepStatic
         * @param {boolean} [deep=false]
         */
        Composite.clear = function(composite, keepStatic, deep) {
            if (deep) {
                for (var i = 0; i < composite.composites.length; i++){
                    Composite.clear(composite.composites[i], keepStatic, true);
                }
            }
            
            if (keepStatic) {
                composite.bodies = composite.bodies.filter(function(body) { return body.isStatic; });
            } else {
                composite.bodies.length = 0;
            }
    
            composite.constraints.length = 0;
            composite.composites.length = 0;
            Composite.setModified(composite, true, true, false);
    
            return composite;
        };
    
        /**
         * Returns all bodies in the given composite, including all bodies in its children, recursively.
         * @method allBodies
         * @param {composite} composite
         * @return {body[]} All the bodies
         */
        Composite.allBodies = function(composite) {
            var bodies = [].concat(composite.bodies);
    
            for (var i = 0; i < composite.composites.length; i++)
                bodies = bodies.concat(Composite.allBodies(composite.composites[i]));
    
            return bodies;
        };
    
        /**
         * Returns all constraints in the given composite, including all constraints in its children, recursively.
         * @method allConstraints
         * @param {composite} composite
         * @return {constraint[]} All the constraints
         */
        Composite.allConstraints = function(composite) {
            var constraints = [].concat(composite.constraints);
    
            for (var i = 0; i < composite.composites.length; i++)
                constraints = constraints.concat(Composite.allConstraints(composite.composites[i]));
    
            return constraints;
        };
    
        /**
         * Returns all composites in the given composite, including all composites in its children, recursively.
         * @method allComposites
         * @param {composite} composite
         * @return {composite[]} All the composites
         */
        Composite.allComposites = function(composite) {
            var composites = [].concat(composite.composites);
    
            for (var i = 0; i < composite.composites.length; i++)
                composites = composites.concat(Composite.allComposites(composite.composites[i]));
    
            return composites;
        };
    
        /**
         * Searches the composite recursively for an object matching the type and id supplied, null if not found.
         * @method get
         * @param {composite} composite
         * @param {number} id
         * @param {string} type
         * @return {object} The requested object, if found
         */
        Composite.get = function(composite, id, type) {
            var objects,
                object;
    
            switch (type) {
            case 'body':
                objects = Composite.allBodies(composite);
                break;
            case 'constraint':
                objects = Composite.allConstraints(composite);
                break;
            case 'composite':
                objects = Composite.allComposites(composite).concat(composite);
                break;
            }
    
            if (!objects)
                return null;
    
            object = objects.filter(function(object) { 
                return object.id.toString() === id.toString(); 
            });
    
            return object.length === 0 ? null : object[0];
        };
    
        /**
         * Moves the given object(s) from compositeA to compositeB (equal to a remove followed by an add).
         * @method move
         * @param {compositeA} compositeA
         * @param {object[]} objects
         * @param {compositeB} compositeB
         * @return {composite} Returns compositeA
         */
        Composite.move = function(compositeA, objects, compositeB) {
            Composite.remove(compositeA, objects);
            Composite.add(compositeB, objects);
            return compositeA;
        };
    
        /**
         * Assigns new ids for all objects in the composite, recursively.
         * @method rebase
         * @param {composite} composite
         * @return {composite} Returns composite
         */
        Composite.rebase = function(composite) {
            var objects = Composite.allBodies(composite)
                            .concat(Composite.allConstraints(composite))
                            .concat(Composite.allComposites(composite));
    
            for (var i = 0; i < objects.length; i++) {
                objects[i].id = Common.nextId();
            }
    
            Composite.setModified(composite, true, true, false);
    
            return composite;
        };
    
        /**
         * Translates all children in the composite by a given vector relative to their current positions, 
         * without imparting any velocity.
         * @method translate
         * @param {composite} composite
         * @param {vector} translation
         * @param {bool} [recursive=true]
         */
        Composite.translate = function(composite, translation, recursive) {
            var bodies = recursive ? Composite.allBodies(composite) : composite.bodies;
    
            for (var i = 0; i < bodies.length; i++) {
                Body.translate(bodies[i], translation);
            }
    
            Composite.setModified(composite, true, true, false);
    
            return composite;
        };
    
        /**
         * Rotates all children in the composite by a given angle about the given point, without imparting any angular velocity.
         * @method rotate
         * @param {composite} composite
         * @param {number} rotation
         * @param {vector} point
         * @param {bool} [recursive=true]
         */
        Composite.rotate = function(composite, rotation, point, recursive) {
            var cos = Math.cos(rotation),
                sin = Math.sin(rotation),
                bodies = recursive ? Composite.allBodies(composite) : composite.bodies;
    
            for (var i = 0; i < bodies.length; i++) {
                var body = bodies[i],
                    dx = body.position.x - point.x,
                    dy = body.position.y - point.y;
                    
                Body.setPosition(body, {
                    x: point.x + (dx * cos - dy * sin),
                    y: point.y + (dx * sin + dy * cos)
                });
    
                Body.rotate(body, rotation);
            }
    
            Composite.setModified(composite, true, true, false);
    
            return composite;
        };
    
        /**
         * Scales all children in the composite, including updating physical properties (mass, area, axes, inertia), from a world-space point.
         * @method scale
         * @param {composite} composite
         * @param {number} scaleX
         * @param {number} scaleY
         * @param {vector} point
         * @param {bool} [recursive=true]
         */
        Composite.scale = function(composite, scaleX, scaleY, point, recursive) {
            var bodies = recursive ? Composite.allBodies(composite) : composite.bodies;
    
            for (var i = 0; i < bodies.length; i++) {
                var body = bodies[i],
                    dx = body.position.x - point.x,
                    dy = body.position.y - point.y;
                    
                Body.setPosition(body, {
                    x: point.x + dx * scaleX,
                    y: point.y + dy * scaleY
                });
    
                Body.scale(body, scaleX, scaleY);
            }
    
            Composite.setModified(composite, true, true, false);
    
            return composite;
        };
    
        /*
        *
        *  Events Documentation
        *
        */
    
        /**
        * Fired when a call to `Composite.add` is made, before objects have been added.
        *
        * @event beforeAdd
        * @param {} event An event object
        * @param {} event.object The object(s) to be added (may be a single body, constraint, composite or a mixed array of these)
        * @param {} event.source The source object of the event
        * @param {} event.name The name of the event
        */
    
        /**
        * Fired when a call to `Composite.add` is made, after objects have been added.
        *
        * @event afterAdd
        * @param {} event An event object
        * @param {} event.object The object(s) that have been added (may be a single body, constraint, composite or a mixed array of these)
        * @param {} event.source The source object of the event
        * @param {} event.name The name of the event
        */
    
        /**
        * Fired when a call to `Composite.remove` is made, before objects have been removed.
        *
        * @event beforeRemove
        * @param {} event An event object
        * @param {} event.object The object(s) to be removed (may be a single body, constraint, composite or a mixed array of these)
        * @param {} event.source The source object of the event
        * @param {} event.name The name of the event
        */
    
        /**
        * Fired when a call to `Composite.remove` is made, after objects have been removed.
        *
        * @event afterRemove
        * @param {} event An event object
        * @param {} event.object The object(s) that have been removed (may be a single body, constraint, composite or a mixed array of these)
        * @param {} event.source The source object of the event
        * @param {} event.name The name of the event
        */
    
        /*
        *
        *  Properties Documentation
        *
        */
    
        /**
         * An integer `Number` uniquely identifying number generated in `Composite.create` by `Common.nextId`.
         *
         * @property id
         * @type number
         */
    
        /**
         * A `String` denoting the type of object.
         *
         * @property type
         * @type string
         * @default "composite"
         * @readOnly
         */
    
        /**
         * An arbitrary `String` name to help the user identify and manage composites.
         *
         * @property label
         * @type string
         * @default "Composite"
         */
    
        /**
         * A flag that specifies whether the composite has been modified during the current step.
         * Most `Matter.Composite` methods will automatically set this flag to `true` to inform the engine of changes to be handled.
         * If you need to change it manually, you should use the `Composite.setModified` method.
         *
         * @property isModified
         * @type boolean
         * @default false
         */
    
        /**
         * The `Composite` that is the parent of this composite. It is automatically managed by the `Matter.Composite` methods.
         *
         * @property parent
         * @type composite
         * @default null
         */
    
        /**
         * An array of `Body` that are _direct_ children of this composite.
         * To add or remove bodies you should use `Composite.add` and `Composite.remove` methods rather than directly modifying this property.
         * If you wish to recursively find all descendants, you should use the `Composite.allBodies` method.
         *
         * @property bodies
         * @type body[]
         * @default []
         */
    
        /**
         * An array of `Constraint` that are _direct_ children of this composite.
         * To add or remove constraints you should use `Composite.add` and `Composite.remove` methods rather than directly modifying this property.
         * If you wish to recursively find all descendants, you should use the `Composite.allConstraints` method.
         *
         * @property constraints
         * @type constraint[]
         * @default []
         */
    
        /**
         * An array of `Composite` that are _direct_ children of this composite.
         * To add or remove composites you should use `Composite.add` and `Composite.remove` methods rather than directly modifying this property.
         * If you wish to recursively find all descendants, you should use the `Composite.allComposites` method.
         *
         * @property composites
         * @type composite[]
         * @default []
         */
    
        /**
         * An object reserved for storing plugin-specific properties.
         *
         * @property plugin
         * @type {}
         */
    
    })();
    
    },{"../core/Common":14,"../core/Events":16,"./Body":1}],3:[function(_dereq_,module,exports){
    /**
    * The `Matter.World` module contains methods for creating and manipulating the world composite.
    * A `Matter.World` is a `Matter.Composite` body, which is a collection of `Matter.Body`, `Matter.Constraint` and other `Matter.Composite`.
    * A `Matter.World` has a few additional properties including `gravity` and `bounds`.
    * It is important to use the functions in the `Matter.Composite` module to modify the world composite, rather than directly modifying its properties.
    * There are also a few methods here that alias those in `Matter.Composite` for easier readability.
    *
    * See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
    *
    * @class World
    * @extends Composite
    */
    
    var World = {};
    
    module.exports = World;
    
    var Composite = _dereq_('./Composite');
    var Constraint = _dereq_('../constraint/Constraint');
    var Common = _dereq_('../core/Common');
    
    (function() {
    
        /**
         * Creates a new world composite. The options parameter is an object that specifies any properties you wish to override the defaults.
         * See the properties section below for detailed information on what you can pass via the `options` object.
         * @method create
         * @constructor
         * @param {} options
         * @return {world} A new world
         */
        World.create = function(options) {
            var composite = Composite.create();
    
            var defaults = {
                label: 'World',
                gravity: {
                    x: 0,
                    y: 1,
                    scale: 0.001
                },
                bounds: { 
                    min: { x: -Infinity, y: -Infinity }, 
                    max: { x: Infinity, y: Infinity } 
                }
            };
            
            return Common.extend(composite, defaults, options);
        };
    
        /*
        *
        *  Properties Documentation
        *
        */
    
        /**
         * The gravity to apply on the world.
         *
         * @property gravity
         * @type object
         */
    
        /**
         * The gravity x component.
         *
         * @property gravity.x
         * @type object
         * @default 0
         */
    
        /**
         * The gravity y component.
         *
         * @property gravity.y
         * @type object
         * @default 1
         */
    
        /**
         * The gravity scale factor.
         *
         * @property gravity.scale
         * @type object
         * @default 0.001
         */
    
        /**
         * A `Bounds` object that defines the world bounds for collision detection.
         *
         * @property bounds
         * @type bounds
         * @default { min: { x: -Infinity, y: -Infinity }, max: { x: Infinity, y: Infinity } }
         */
    
        // World is a Composite body
        // see src/module/Outro.js for these aliases:
        
        /**
         * An alias for Composite.clear
         * @method clear
         * @param {world} world
         * @param {boolean} keepStatic
         */
    
        /**
         * An alias for Composite.add
         * @method addComposite
         * @param {world} world
         * @param {composite} composite
         * @return {world} The original world with the objects from composite added
         */
        
         /**
          * An alias for Composite.addBody
          * @method addBody
          * @param {world} world
          * @param {body} body
          * @return {world} The original world with the body added
          */
    
         /**
          * An alias for Composite.addConstraint
          * @method addConstraint
          * @param {world} world
          * @param {constraint} constraint
          * @return {world} The original world with the constraint added
          */
    
    })();
    
    },{"../constraint/Constraint":12,"../core/Common":14,"./Composite":2}],4:[function(_dereq_,module,exports){
    /**
    * The `Matter.Contact` module contains methods for creating and manipulating collision contacts.
    *
    * @class Contact
    */
    
    var Contact = {};
    
    module.exports = Contact;
    
    (function() {
    
        /**
         * Creates a new contact.
         * @method create
         * @param {vertex} vertex
         * @return {contact} A new contact
         */
        Contact.create = function(vertex) {
            return {
                id: Contact.id(vertex),
                vertex: vertex,
                normalImpulse: 0,
                tangentImpulse: 0
            };
        };
        
        /**
         * Generates a contact id.
         * @method id
         * @param {vertex} vertex
         * @return {string} Unique contactID
         */
        Contact.id = function(vertex) {
            return vertex.body.id + '_' + vertex.index;
        };
    
    })();
    
    },{}],5:[function(_dereq_,module,exports){
    /**
    * The `Matter.Detector` module contains methods for detecting collisions given a set of pairs.
    *
    * @class Detector
    */
    
    // TODO: speculative contacts
    
    var Detector = {};
    
    module.exports = Detector;
    
    var SAT = _dereq_('./SAT');
    var Pair = _dereq_('./Pair');
    var Bounds = _dereq_('../geometry/Bounds');
    
    (function() {
    
        /**
         * Finds all collisions given a list of pairs.
         * @method collisions
         * @param {pair[]} broadphasePairs
         * @param {engine} engine
         * @return {array} collisions
         */
        Detector.collisions = function(broadphasePairs, engine) {
            var collisions = [],
                pairsTable = engine.pairs.table;
    
            
            for (var i = 0; i < broadphasePairs.length; i++) {
                var bodyA = broadphasePairs[i][0], 
                    bodyB = broadphasePairs[i][1];
    
                if ((bodyA.isStatic || bodyA.isSleeping) && (bodyB.isStatic || bodyB.isSleeping))
                    continue;
                
                if (!Detector.canCollide(bodyA.collisionFilter, bodyB.collisionFilter))
                    continue;
    
    
                // mid phase
                if (Bounds.overlaps(bodyA.bounds, bodyB.bounds)) {
                    for (var j = bodyA.parts.length > 1 ? 1 : 0; j < bodyA.parts.length; j++) {
                        var partA = bodyA.parts[j];
    
                        for (var k = bodyB.parts.length > 1 ? 1 : 0; k < bodyB.parts.length; k++) {
                            var partB = bodyB.parts[k];
    
                            if ((partA === bodyA && partB === bodyB) || Bounds.overlaps(partA.bounds, partB.bounds)) {
                                // find a previous collision we could reuse
                                var pairId = Pair.id(partA, partB),
                                    pair = pairsTable[pairId],
                                    previousCollision;
    
                                if (pair && pair.isActive) {
                                    previousCollision = pair.collision;
                                } else {
                                    previousCollision = null;
                                }
    
                                // narrow phase
                                var collision = SAT.collides(partA, partB, previousCollision);
    
    
                                if (collision.collided) {
                                    collisions.push(collision);
                                }
                            }
                        }
                    }
                }
            }
    
            return collisions;
        };
    
        /**
         * Returns `true` if both supplied collision filters will allow a collision to occur.
         * See `body.collisionFilter` for more information.
         * @method canCollide
         * @param {} filterA
         * @param {} filterB
         * @return {bool} `true` if collision can occur
         */
        Detector.canCollide = function(filterA, filterB) {
            if (filterA.group === filterB.group && filterA.group !== 0)
                return filterA.group > 0;
    
            return (filterA.mask & filterB.category) !== 0 && (filterB.mask & filterA.category) !== 0;
        };
    
    })();
    
    },{"../geometry/Bounds":26,"./Pair":7,"./SAT":11}],6:[function(_dereq_,module,exports){
    /**
    * The `Matter.Grid` module contains methods for creating and manipulating collision broadphase grid structures.
    *
    * @class Grid
    */
    
    var Grid = {};
    
    module.exports = Grid;
    
    var Pair = _dereq_('./Pair');
    var Detector = _dereq_('./Detector');
    var Common = _dereq_('../core/Common');
    
    (function() {
    
        /**
         * Creates a new grid.
         * @method create
         * @param {} options
         * @return {grid} A new grid
         */
        Grid.create = function(options) {
            var defaults = {
                controller: Grid,
                detector: Detector.collisions,
                buckets: {},
                pairs: {},
                pairsList: [],
                bucketWidth: 48,
                bucketHeight: 48
            };
    
            return Common.extend(defaults, options);
        };
    
        /**
         * The width of a single grid bucket.
         *
         * @property bucketWidth
         * @type number
         * @default 48
         */
    
        /**
         * The height of a single grid bucket.
         *
         * @property bucketHeight
         * @type number
         * @default 48
         */
    
        /**
         * Updates the grid.
         * @method update
         * @param {grid} grid
         * @param {body[]} bodies
         * @param {engine} engine
         * @param {boolean} forceUpdate
         */
        Grid.update = function(grid, bodies, engine, forceUpdate) {
            var i, col, row,
                world = engine.world,
                buckets = grid.buckets,
                bucket,
                bucketId,
                gridChanged = false;
    
    
            for (i = 0; i < bodies.length; i++) {
                var body = bodies[i];
    
                if (body.isSleeping && !forceUpdate)
                    continue;
    
                // don't update out of world bodies
                if (body.bounds.max.x < world.bounds.min.x || body.bounds.min.x > world.bounds.max.x
                    || body.bounds.max.y < world.bounds.min.y || body.bounds.min.y > world.bounds.max.y)
                    continue;
    
                var newRegion = _getRegion(grid, body);
    
                // if the body has changed grid region
                if (!body.region || newRegion.id !== body.region.id || forceUpdate) {
    
    
                    if (!body.region || forceUpdate)
                        body.region = newRegion;
    
                    var union = _regionUnion(newRegion, body.region);
    
                    // update grid buckets affected by region change
                    // iterate over the union of both regions
                    for (col = union.startCol; col <= union.endCol; col++) {
                        for (row = union.startRow; row <= union.endRow; row++) {
                            bucketId = _getBucketId(col, row);
                            bucket = buckets[bucketId];
    
                            var isInsideNewRegion = (col >= newRegion.startCol && col <= newRegion.endCol
                                                    && row >= newRegion.startRow && row <= newRegion.endRow);
    
                            var isInsideOldRegion = (col >= body.region.startCol && col <= body.region.endCol
                                                    && row >= body.region.startRow && row <= body.region.endRow);
    
                            // remove from old region buckets
                            if (!isInsideNewRegion && isInsideOldRegion) {
                                if (isInsideOldRegion) {
                                    if (bucket)
                                        _bucketRemoveBody(grid, bucket, body);
                                }
                            }
    
                            // add to new region buckets
                            if (body.region === newRegion || (isInsideNewRegion && !isInsideOldRegion) || forceUpdate) {
                                if (!bucket)
                                    bucket = _createBucket(buckets, bucketId);
                                _bucketAddBody(grid, bucket, body);
                            }
                        }
                    }
    
                    // set the new region
                    body.region = newRegion;
    
                    // flag changes so we can update pairs
                    gridChanged = true;
                }
            }
    
            // update pairs list only if pairs changed (i.e. a body changed region)
            if (gridChanged)
                grid.pairsList = _createActivePairsList(grid);
        };
    
        /**
         * Clears the grid.
         * @method clear
         * @param {grid} grid
         */
        Grid.clear = function(grid) {
            grid.buckets = {};
            grid.pairs = {};
            grid.pairsList = [];
        };
    
        /**
         * Finds the union of two regions.
         * @method _regionUnion
         * @private
         * @param {} regionA
         * @param {} regionB
         * @return {} region
         */
        var _regionUnion = function(regionA, regionB) {
            var startCol = Math.min(regionA.startCol, regionB.startCol),
                endCol = Math.max(regionA.endCol, regionB.endCol),
                startRow = Math.min(regionA.startRow, regionB.startRow),
                endRow = Math.max(regionA.endRow, regionB.endRow);
    
            return _createRegion(startCol, endCol, startRow, endRow);
        };
    
        /**
         * Gets the region a given body falls in for a given grid.
         * @method _getRegion
         * @private
         * @param {} grid
         * @param {} body
         * @return {} region
         */
        var _getRegion = function(grid, body) {
            var bounds = body.bounds,
                startCol = Math.floor(bounds.min.x / grid.bucketWidth),
                endCol = Math.floor(bounds.max.x / grid.bucketWidth),
                startRow = Math.floor(bounds.min.y / grid.bucketHeight),
                endRow = Math.floor(bounds.max.y / grid.bucketHeight);
    
            return _createRegion(startCol, endCol, startRow, endRow);
        };
    
        /**
         * Creates a region.
         * @method _createRegion
         * @private
         * @param {} startCol
         * @param {} endCol
         * @param {} startRow
         * @param {} endRow
         * @return {} region
         */
        var _createRegion = function(startCol, endCol, startRow, endRow) {
            return { 
                id: startCol + ',' + endCol + ',' + startRow + ',' + endRow,
                startCol: startCol, 
                endCol: endCol, 
                startRow: startRow, 
                endRow: endRow 
            };
        };
    
        /**
         * Gets the bucket id at the given position.
         * @method _getBucketId
         * @private
         * @param {} column
         * @param {} row
         * @return {string} bucket id
         */
        var _getBucketId = function(column, row) {
            return 'C' + column + 'R' + row;
        };
    
        /**
         * Creates a bucket.
         * @method _createBucket
         * @private
         * @param {} buckets
         * @param {} bucketId
         * @return {} bucket
         */
        var _createBucket = function(buckets, bucketId) {
            var bucket = buckets[bucketId] = [];
            return bucket;
        };
    
        /**
         * Adds a body to a bucket.
         * @method _bucketAddBody
         * @private
         * @param {} grid
         * @param {} bucket
         * @param {} body
         */
        var _bucketAddBody = function(grid, bucket, body) {
            // add new pairs
            for (var i = 0; i < bucket.length; i++) {
                var bodyB = bucket[i];
    
                if (body.id === bodyB.id || (body.isStatic && bodyB.isStatic))
                    continue;
    
                // keep track of the number of buckets the pair exists in
                // important for Grid.update to work
                var pairId = Pair.id(body, bodyB),
                    pair = grid.pairs[pairId];
    
                if (pair) {
                    pair[2] += 1;
                } else {
                    grid.pairs[pairId] = [body, bodyB, 1];
                }
            }
    
            // add to bodies (after pairs, otherwise pairs with self)
            bucket.push(body);
        };
    
        /**
         * Removes a body from a bucket.
         * @method _bucketRemoveBody
         * @private
         * @param {} grid
         * @param {} bucket
         * @param {} body
         */
        var _bucketRemoveBody = function(grid, bucket, body) {
            // remove from bucket
            bucket.splice(Common.indexOf(bucket, body), 1);
    
            // update pair counts
            for (var i = 0; i < bucket.length; i++) {
                // keep track of the number of buckets the pair exists in
                // important for _createActivePairsList to work
                var bodyB = bucket[i],
                    pairId = Pair.id(body, bodyB),
                    pair = grid.pairs[pairId];
    
                if (pair)
                    pair[2] -= 1;
            }
        };
    
        /**
         * Generates a list of the active pairs in the grid.
         * @method _createActivePairsList
         * @private
         * @param {} grid
         * @return [] pairs
         */
        var _createActivePairsList = function(grid) {
            var pairKeys,
                pair,
                pairs = [];
    
            // grid.pairs is used as a hashmap
            pairKeys = Common.keys(grid.pairs);
    
            // iterate over grid.pairs
            for (var k = 0; k < pairKeys.length; k++) {
                pair = grid.pairs[pairKeys[k]];
    
                // if pair exists in at least one bucket
                // it is a pair that needs further collision testing so push it
                if (pair[2] > 0) {
                    pairs.push(pair);
                } else {
                    delete grid.pairs[pairKeys[k]];
                }
            }
    
            return pairs;
        };
        
    })();
    
    },{"../core/Common":14,"./Detector":5,"./Pair":7}],7:[function(_dereq_,module,exports){
    /**
    * The `Matter.Pair` module contains methods for creating and manipulating collision pairs.
    *
    * @class Pair
    */
    
    var Pair = {};
    
    module.exports = Pair;
    
    var Contact = _dereq_('./Contact');
    
    (function() {
        
        /**
         * Creates a pair.
         * @method create
         * @param {collision} collision
         * @param {number} timestamp
         * @return {pair} A new pair
         */
        Pair.create = function(collision, timestamp) {
            var bodyA = collision.bodyA,
                bodyB = collision.bodyB,
                parentA = collision.parentA,
                parentB = collision.parentB;
    
            var pair = {
                id: Pair.id(bodyA, bodyB),
                bodyA: bodyA,
                bodyB: bodyB,
                contacts: {},
                activeContacts: [],
                separation: 0,
                isActive: true,
                isSensor: bodyA.isSensor || bodyB.isSensor,
                timeCreated: timestamp,
                timeUpdated: timestamp,
                inverseMass: parentA.inverseMass + parentB.inverseMass,
                friction: Math.min(parentA.friction, parentB.friction),
                frictionStatic: Math.max(parentA.frictionStatic, parentB.frictionStatic),
                restitution: Math.max(parentA.restitution, parentB.restitution),
                slop: Math.max(parentA.slop, parentB.slop)
            };
    
            Pair.update(pair, collision, timestamp);
    
            return pair;
        };
    
        /**
         * Updates a pair given a collision.
         * @method update
         * @param {pair} pair
         * @param {collision} collision
         * @param {number} timestamp
         */
        Pair.update = function(pair, collision, timestamp) {
            var contacts = pair.contacts,
                supports = collision.supports,
                activeContacts = pair.activeContacts,
                parentA = collision.parentA,
                parentB = collision.parentB;
            
            pair.collision = collision;
            pair.inverseMass = parentA.inverseMass + parentB.inverseMass;
            pair.friction = Math.min(parentA.friction, parentB.friction);
            pair.frictionStatic = Math.max(parentA.frictionStatic, parentB.frictionStatic);
            pair.restitution = Math.max(parentA.restitution, parentB.restitution);
            pair.slop = Math.max(parentA.slop, parentB.slop);
            activeContacts.length = 0;
            
            if (collision.collided) {
                for (var i = 0; i < supports.length; i++) {
                    var support = supports[i],
                        contactId = Contact.id(support),
                        contact = contacts[contactId];
    
                    if (contact) {
                        activeContacts.push(contact);
                    } else {
                        activeContacts.push(contacts[contactId] = Contact.create(support));
                    }
                }
    
                pair.separation = collision.depth;
                Pair.setActive(pair, true, timestamp);
            } else {
                if (pair.isActive === true)
                    Pair.setActive(pair, false, timestamp);
            }
        };
        
        /**
         * Set a pair as active or inactive.
         * @method setActive
         * @param {pair} pair
         * @param {bool} isActive
         * @param {number} timestamp
         */
        Pair.setActive = function(pair, isActive, timestamp) {
            if (isActive) {
                pair.isActive = true;
                pair.timeUpdated = timestamp;
            } else {
                pair.isActive = false;
                pair.activeContacts.length = 0;
            }
        };
    
        /**
         * Get the id for the given pair.
         * @method id
         * @param {body} bodyA
         * @param {body} bodyB
         * @return {string} Unique pairId
         */
        Pair.id = function(bodyA, bodyB) {
            if (bodyA.id < bodyB.id) {
                return 'A' + bodyA.id + 'B' + bodyB.id;
            } else {
                return 'A' + bodyB.id + 'B' + bodyA.id;
            }
        };
    
    })();
    
    },{"./Contact":4}],8:[function(_dereq_,module,exports){
    /**
    * The `Matter.Pairs` module contains methods for creating and manipulating collision pair sets.
    *
    * @class Pairs
    */
    
    var Pairs = {};
    
    module.exports = Pairs;
    
    var Pair = _dereq_('./Pair');
    var Common = _dereq_('../core/Common');
    
    (function() {
        
        var _pairMaxIdleLife = 1000;
    
        /**
         * Creates a new pairs structure.
         * @method create
         * @param {object} options
         * @return {pairs} A new pairs structure
         */
        Pairs.create = function(options) {
            return Common.extend({ 
                table: {},
                list: [],
                collisionStart: [],
                collisionActive: [],
                collisionEnd: []
            }, options);
        };
    
        /**
         * Updates pairs given a list of collisions.
         * @method update
         * @param {object} pairs
         * @param {collision[]} collisions
         * @param {number} timestamp
         */
        Pairs.update = function(pairs, collisions, timestamp) {
            var pairsList = pairs.list,
                pairsTable = pairs.table,
                collisionStart = pairs.collisionStart,
                collisionEnd = pairs.collisionEnd,
                collisionActive = pairs.collisionActive,
                activePairIds = [],
                collision,
                pairId,
                pair,
                i;
    
            // clear collision state arrays, but maintain old reference
            collisionStart.length = 0;
            collisionEnd.length = 0;
            collisionActive.length = 0;
    
            for (i = 0; i < collisions.length; i++) {
                collision = collisions[i];
    
                if (collision.collided) {
                    pairId = Pair.id(collision.bodyA, collision.bodyB);
                    activePairIds.push(pairId);
    
                    pair = pairsTable[pairId];
                    
                    if (pair) {
                        // pair already exists (but may or may not be active)
                        if (pair.isActive) {
                            // pair exists and is active
                            collisionActive.push(pair);
                        } else {
                            // pair exists but was inactive, so a collision has just started again
                            collisionStart.push(pair);
                        }
    
                        // update the pair
                        Pair.update(pair, collision, timestamp);
                    } else {
                        // pair did not exist, create a new pair
                        pair = Pair.create(collision, timestamp);
                        pairsTable[pairId] = pair;
    
                        // push the new pair
                        collisionStart.push(pair);
                        pairsList.push(pair);
                    }
                }
            }
    
            // deactivate previously active pairs that are now inactive
            for (i = 0; i < pairsList.length; i++) {
                pair = pairsList[i];
                if (pair.isActive && Common.indexOf(activePairIds, pair.id) === -1) {
                    Pair.setActive(pair, false, timestamp);
                    collisionEnd.push(pair);
                }
            }
        };
        
        /**
         * Finds and removes pairs that have been inactive for a set amount of time.
         * @method removeOld
         * @param {object} pairs
         * @param {number} timestamp
         */
        Pairs.removeOld = function(pairs, timestamp) {
            var pairsList = pairs.list,
                pairsTable = pairs.table,
                indexesToRemove = [],
                pair,
                collision,
                pairIndex,
                i;
    
            for (i = 0; i < pairsList.length; i++) {
                pair = pairsList[i];
                collision = pair.collision;
                
                // never remove sleeping pairs
                if (collision.bodyA.isSleeping || collision.bodyB.isSleeping) {
                    pair.timeUpdated = timestamp;
                    continue;
                }
    
                // if pair is inactive for too long, mark it to be removed
                if (timestamp - pair.timeUpdated > _pairMaxIdleLife) {
                    indexesToRemove.push(i);
                }
            }
    
            // remove marked pairs
            for (i = 0; i < indexesToRemove.length; i++) {
                pairIndex = indexesToRemove[i] - i;
                pair = pairsList[pairIndex];
                delete pairsTable[pair.id];
                pairsList.splice(pairIndex, 1);
            }
        };
    
        /**
         * Clears the given pairs structure.
         * @method clear
         * @param {pairs} pairs
         * @return {pairs} pairs
         */
        Pairs.clear = function(pairs) {
            pairs.table = {};
            pairs.list.length = 0;
            pairs.collisionStart.length = 0;
            pairs.collisionActive.length = 0;
            pairs.collisionEnd.length = 0;
            return pairs;
        };
    
    })();
    
    },{"../core/Common":14,"./Pair":7}],9:[function(_dereq_,module,exports){
    /**
    * The `Matter.Query` module contains methods for performing collision queries.
    *
    * See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
    *
    * @class Query
    */
    
    var Query = {};
    
    module.exports = Query;
    
    var Vector = _dereq_('../geometry/Vector');
    var SAT = _dereq_('./SAT');
    var Bounds = _dereq_('../geometry/Bounds');
    var Bodies = _dereq_('../factory/Bodies');
    var Vertices = _dereq_('../geometry/Vertices');
    
    (function() {
    
        /**
         * Casts a ray segment against a set of bodies and returns all collisions, ray width is optional. Intersection points are not provided.
         * @method ray
         * @param {body[]} bodies
         * @param {vector} startPoint
         * @param {vector} endPoint
         * @param {number} [rayWidth]
         * @return {object[]} Collisions
         */
        Query.ray = function(bodies, startPoint, endPoint, rayWidth) {
            rayWidth = rayWidth || 1e-100;
    
            var rayAngle = Vector.angle(startPoint, endPoint),
                rayLength = Vector.magnitude(Vector.sub(startPoint, endPoint)),
                rayX = (endPoint.x + startPoint.x) * 0.5,
                rayY = (endPoint.y + startPoint.y) * 0.5,
                ray = Bodies.rectangle(rayX, rayY, rayLength, rayWidth, { angle: rayAngle }),
                collisions = [];
    
            for (var i = 0; i < bodies.length; i++) {
                var bodyA = bodies[i];
                
                if (Bounds.overlaps(bodyA.bounds, ray.bounds)) {
                    for (var j = bodyA.parts.length === 1 ? 0 : 1; j < bodyA.parts.length; j++) {
                        var part = bodyA.parts[j];
    
                        if (Bounds.overlaps(part.bounds, ray.bounds)) {
                            var collision = SAT.collides(part, ray);
                            if (collision.collided) {
                                collision.body = collision.bodyA = collision.bodyB = bodyA;
                                collisions.push(collision);
                                break;
                            }
                        }
                    }
                }
            }
    
            return collisions;
        };
    
        /**
         * Returns all bodies whose bounds are inside (or outside if set) the given set of bounds, from the given set of bodies.
         * @method region
         * @param {body[]} bodies
         * @param {bounds} bounds
         * @param {bool} [outside=false]
         * @return {body[]} The bodies matching the query
         */
        Query.region = function(bodies, bounds, outside) {
            var result = [];
    
            for (var i = 0; i < bodies.length; i++) {
                var body = bodies[i],
                    overlaps = Bounds.overlaps(body.bounds, bounds);
                if ((overlaps && !outside) || (!overlaps && outside))
                    result.push(body);
            }
    
            return result;
        };
    
        /**
         * Returns all bodies whose vertices contain the given point, from the given set of bodies.
         * @method point
         * @param {body[]} bodies
         * @param {vector} point
         * @return {body[]} The bodies matching the query
         */
        Query.point = function(bodies, point) {
            var result = [];
    
            for (var i = 0; i < bodies.length; i++) {
                var body = bodies[i];
                
                if (Bounds.contains(body.bounds, point)) {
                    for (var j = body.parts.length === 1 ? 0 : 1; j < body.parts.length; j++) {
                        var part = body.parts[j];
    
                        if (Bounds.contains(part.bounds, point)
                            && Vertices.contains(part.vertices, point)) {
                            result.push(body);
                            break;
                        }
                    }
                }
            }
    
            return result;
        };
    
    })();
    
    },{"../factory/Bodies":23,"../geometry/Bounds":26,"../geometry/Vector":28,"../geometry/Vertices":29,"./SAT":11}],10:[function(_dereq_,module,exports){
    /**
    * The `Matter.Resolver` module contains methods for resolving collision pairs.
    *
    * @class Resolver
    */
    
    var Resolver = {};
    
    module.exports = Resolver;
    
    var Vertices = _dereq_('../geometry/Vertices');
    var Vector = _dereq_('../geometry/Vector');
    var Common = _dereq_('../core/Common');
    var Bounds = _dereq_('../geometry/Bounds');
    
    (function() {
    
        Resolver._restingThresh = 4;
        Resolver._restingThreshTangent = 6;
        Resolver._positionDampen = 0.9;
        Resolver._positionWarming = 0.8;
        Resolver._frictionNormalMultiplier = 5;
    
        /**
         * Prepare pairs for position solving.
         * @method preSolvePosition
         * @param {pair[]} pairs
         */
        Resolver.preSolvePosition = function(pairs) {
            var i,
                pair,
                activeCount;
    
            // find total contacts on each body
            for (i = 0; i < pairs.length; i++) {
                pair = pairs[i];
                
                if (!pair.isActive)
                    continue;
                
                activeCount = pair.activeContacts.length;
                pair.collision.parentA.totalContacts += activeCount;
                pair.collision.parentB.totalContacts += activeCount;
            }
        };
    
        /**
         * Find a solution for pair positions.
         * @method solvePosition
         * @param {pair[]} pairs
         * @param {number} timeScale
         */
        Resolver.solvePosition = function(pairs, timeScale) {
            var i,
                pair,
                collision,
                bodyA,
                bodyB,
                normal,
                bodyBtoA,
                contactShare,
                positionImpulse,
                contactCount = {},
                tempA = Vector._temp[0],
                tempB = Vector._temp[1],
                tempC = Vector._temp[2],
                tempD = Vector._temp[3];
    
            // find impulses required to resolve penetration
            for (i = 0; i < pairs.length; i++) {
                pair = pairs[i];
                
                if (!pair.isActive || pair.isSensor)
                    continue;
    
                collision = pair.collision;
                bodyA = collision.parentA;
                bodyB = collision.parentB;
                normal = collision.normal;
    
                // get current separation between body edges involved in collision
                bodyBtoA = Vector.sub(Vector.add(bodyB.positionImpulse, bodyB.position, tempA), 
                                        Vector.add(bodyA.positionImpulse, 
                                            Vector.sub(bodyB.position, collision.penetration, tempB), tempC), tempD);
    
                pair.separation = Vector.dot(normal, bodyBtoA);
            }
            
            for (i = 0; i < pairs.length; i++) {
                pair = pairs[i];
    
                if (!pair.isActive || pair.isSensor || pair.separation < 0)
                    continue;
                
                collision = pair.collision;
                bodyA = collision.parentA;
                bodyB = collision.parentB;
                normal = collision.normal;
                positionImpulse = (pair.separation - pair.slop) * timeScale;
    
                if (bodyA.isStatic || bodyB.isStatic)
                    positionImpulse *= 2;
                
                if (!(bodyA.isStatic || bodyA.isSleeping)) {
                    contactShare = Resolver._positionDampen / bodyA.totalContacts;
                    bodyA.positionImpulse.x += normal.x * positionImpulse * contactShare;
                    bodyA.positionImpulse.y += normal.y * positionImpulse * contactShare;
                }
    
                if (!(bodyB.isStatic || bodyB.isSleeping)) {
                    contactShare = Resolver._positionDampen / bodyB.totalContacts;
                    bodyB.positionImpulse.x -= normal.x * positionImpulse * contactShare;
                    bodyB.positionImpulse.y -= normal.y * positionImpulse * contactShare;
                }
            }
        };
    
        /**
         * Apply position resolution.
         * @method postSolvePosition
         * @param {body[]} bodies
         */
        Resolver.postSolvePosition = function(bodies) {
            for (var i = 0; i < bodies.length; i++) {
                var body = bodies[i];
    
                // reset contact count
                body.totalContacts = 0;
    
                if (body.positionImpulse.x !== 0 || body.positionImpulse.y !== 0) {
                    // update body geometry
                    for (var j = 0; j < body.parts.length; j++) {
                        var part = body.parts[j];
                        Vertices.translate(part.vertices, body.positionImpulse);
                        Bounds.update(part.bounds, part.vertices, body.velocity);
                        part.position.x += body.positionImpulse.x;
                        part.position.y += body.positionImpulse.y;
                    }
    
                    // move the body without changing velocity
                    body.positionPrev.x += body.positionImpulse.x;
                    body.positionPrev.y += body.positionImpulse.y;
    
                    if (Vector.dot(body.positionImpulse, body.velocity) < 0) {
                        // reset cached impulse if the body has velocity along it
                        body.positionImpulse.x = 0;
                        body.positionImpulse.y = 0;
                    } else {
                        // warm the next iteration
                        body.positionImpulse.x *= Resolver._positionWarming;
                        body.positionImpulse.y *= Resolver._positionWarming;
                    }
                }
            }
        };
    
        /**
         * Prepare pairs for velocity solving.
         * @method preSolveVelocity
         * @param {pair[]} pairs
         */
        Resolver.preSolveVelocity = function(pairs) {
            var i,
                j,
                pair,
                contacts,
                collision,
                bodyA,
                bodyB,
                normal,
                tangent,
                contact,
                contactVertex,
                normalImpulse,
                tangentImpulse,
                offset,
                impulse = Vector._temp[0],
                tempA = Vector._temp[1];
            
            for (i = 0; i < pairs.length; i++) {
                pair = pairs[i];
                
                if (!pair.isActive || pair.isSensor)
                    continue;
                
                contacts = pair.activeContacts;
                collision = pair.collision;
                bodyA = collision.parentA;
                bodyB = collision.parentB;
                normal = collision.normal;
                tangent = collision.tangent;
    
                // resolve each contact
                for (j = 0; j < contacts.length; j++) {
                    contact = contacts[j];
                    contactVertex = contact.vertex;
                    normalImpulse = contact.normalImpulse;
                    tangentImpulse = contact.tangentImpulse;
    
                    if (normalImpulse !== 0 || tangentImpulse !== 0) {
                        // total impulse from contact
                        impulse.x = (normal.x * normalImpulse) + (tangent.x * tangentImpulse);
                        impulse.y = (normal.y * normalImpulse) + (tangent.y * tangentImpulse);
                        
                        // apply impulse from contact
                        if (!(bodyA.isStatic || bodyA.isSleeping)) {
                            offset = Vector.sub(contactVertex, bodyA.position, tempA);
                            bodyA.positionPrev.x += impulse.x * bodyA.inverseMass;
                            bodyA.positionPrev.y += impulse.y * bodyA.inverseMass;
                            bodyA.anglePrev += Vector.cross(offset, impulse) * bodyA.inverseInertia;
                        }
    
                        if (!(bodyB.isStatic || bodyB.isSleeping)) {
                            offset = Vector.sub(contactVertex, bodyB.position, tempA);
                            bodyB.positionPrev.x -= impulse.x * bodyB.inverseMass;
                            bodyB.positionPrev.y -= impulse.y * bodyB.inverseMass;
                            bodyB.anglePrev -= Vector.cross(offset, impulse) * bodyB.inverseInertia;
                        }
                    }
                }
            }
        };
    
        /**
         * Find a solution for pair velocities.
         * @method solveVelocity
         * @param {pair[]} pairs
         * @param {number} timeScale
         */
        Resolver.solveVelocity = function(pairs, timeScale) {
            var timeScaleSquared = timeScale * timeScale,
                impulse = Vector._temp[0],
                tempA = Vector._temp[1],
                tempB = Vector._temp[2],
                tempC = Vector._temp[3],
                tempD = Vector._temp[4],
                tempE = Vector._temp[5];
            
            for (var i = 0; i < pairs.length; i++) {
                var pair = pairs[i];
                
                if (!pair.isActive || pair.isSensor)
                    continue;
                
                var collision = pair.collision,
                    bodyA = collision.parentA,
                    bodyB = collision.parentB,
                    normal = collision.normal,
                    tangent = collision.tangent,
                    contacts = pair.activeContacts,
                    contactShare = 1 / contacts.length;
    
                // update body velocities
                bodyA.velocity.x = bodyA.position.x - bodyA.positionPrev.x;
                bodyA.velocity.y = bodyA.position.y - bodyA.positionPrev.y;
                bodyB.velocity.x = bodyB.position.x - bodyB.positionPrev.x;
                bodyB.velocity.y = bodyB.position.y - bodyB.positionPrev.y;
                bodyA.angularVelocity = bodyA.angle - bodyA.anglePrev;
                bodyB.angularVelocity = bodyB.angle - bodyB.anglePrev;
    
                // resolve each contact
                for (var j = 0; j < contacts.length; j++) {
                    var contact = contacts[j],
                        contactVertex = contact.vertex,
                        offsetA = Vector.sub(contactVertex, bodyA.position, tempA),
                        offsetB = Vector.sub(contactVertex, bodyB.position, tempB),
                        velocityPointA = Vector.add(bodyA.velocity, Vector.mult(Vector.perp(offsetA), bodyA.angularVelocity), tempC),
                        velocityPointB = Vector.add(bodyB.velocity, Vector.mult(Vector.perp(offsetB), bodyB.angularVelocity), tempD), 
                        relativeVelocity = Vector.sub(velocityPointA, velocityPointB, tempE),
                        normalVelocity = Vector.dot(normal, relativeVelocity);
    
                    var tangentVelocity = Vector.dot(tangent, relativeVelocity),
                        tangentSpeed = Math.abs(tangentVelocity),
                        tangentVelocityDirection = Common.sign(tangentVelocity);
    
                    // raw impulses
                    var normalImpulse = (1 + pair.restitution) * normalVelocity,
                        normalForce = Common.clamp(pair.separation + normalVelocity, 0, 1) * Resolver._frictionNormalMultiplier;
    
                    // coulomb friction
                    var tangentImpulse = tangentVelocity,
                        maxFriction = Infinity;
    
                    if (tangentSpeed > pair.friction * pair.frictionStatic * normalForce * timeScaleSquared) {
                        maxFriction = tangentSpeed;
                        tangentImpulse = Common.clamp(
                            pair.friction * tangentVelocityDirection * timeScaleSquared,
                            -maxFriction, maxFriction
                        );
                    }
    
                    // modify impulses accounting for mass, inertia and offset
                    var oAcN = Vector.cross(offsetA, normal),
                        oBcN = Vector.cross(offsetB, normal),
                        share = contactShare / (bodyA.inverseMass + bodyB.inverseMass + bodyA.inverseInertia * oAcN * oAcN  + bodyB.inverseInertia * oBcN * oBcN);
    
                    normalImpulse *= share;
                    tangentImpulse *= share;
    
                    // handle high velocity and resting collisions separately
                    if (normalVelocity < 0 && normalVelocity * normalVelocity > Resolver._restingThresh * timeScaleSquared) {
                        // high normal velocity so clear cached contact normal impulse
                        contact.normalImpulse = 0;
                    } else {
                        // solve resting collision constraints using Erin Catto's method (GDC08)
                        // impulse constraint tends to 0
                        var contactNormalImpulse = contact.normalImpulse;
                        contact.normalImpulse = Math.min(contact.normalImpulse + normalImpulse, 0);
                        normalImpulse = contact.normalImpulse - contactNormalImpulse;
                    }
    
                    // handle high velocity and resting collisions separately
                    if (tangentVelocity * tangentVelocity > Resolver._restingThreshTangent * timeScaleSquared) {
                        // high tangent velocity so clear cached contact tangent impulse
                        contact.tangentImpulse = 0;
                    } else {
                        // solve resting collision constraints using Erin Catto's method (GDC08)
                        // tangent impulse tends to -tangentSpeed or +tangentSpeed
                        var contactTangentImpulse = contact.tangentImpulse;
                        contact.tangentImpulse = Common.clamp(contact.tangentImpulse + tangentImpulse, -maxFriction, maxFriction);
                        tangentImpulse = contact.tangentImpulse - contactTangentImpulse;
                    }
    
                    // total impulse from contact
                    impulse.x = (normal.x * normalImpulse) + (tangent.x * tangentImpulse);
                    impulse.y = (normal.y * normalImpulse) + (tangent.y * tangentImpulse);
                    
                    // apply impulse from contact
                    if (!(bodyA.isStatic || bodyA.isSleeping)) {
                        bodyA.positionPrev.x += impulse.x * bodyA.inverseMass;
                        bodyA.positionPrev.y += impulse.y * bodyA.inverseMass;
                        bodyA.anglePrev += Vector.cross(offsetA, impulse) * bodyA.inverseInertia;
                    }
    
                    if (!(bodyB.isStatic || bodyB.isSleeping)) {
                        bodyB.positionPrev.x -= impulse.x * bodyB.inverseMass;
                        bodyB.positionPrev.y -= impulse.y * bodyB.inverseMass;
                        bodyB.anglePrev -= Vector.cross(offsetB, impulse) * bodyB.inverseInertia;
                    }
                }
            }
        };
    
    })();
    
    },{"../core/Common":14,"../geometry/Bounds":26,"../geometry/Vector":28,"../geometry/Vertices":29}],11:[function(_dereq_,module,exports){
    /**
    * The `Matter.SAT` module contains methods for detecting collisions using the Separating Axis Theorem.
    *
    * @class SAT
    */
    
    // TODO: true circles and curves
    
    var SAT = {};
    
    module.exports = SAT;
    
    var Vertices = _dereq_('../geometry/Vertices');
    var Vector = _dereq_('../geometry/Vector');
    
    (function() {
    
        /**
         * Detect collision between two bodies using the Separating Axis Theorem.
         * @method collides
         * @param {body} bodyA
         * @param {body} bodyB
         * @param {collision} previousCollision
         * @return {collision} collision
         */
        SAT.collides = function(bodyA, bodyB, previousCollision) {
            var overlapAB,
                overlapBA, 
                minOverlap,
                collision,
                canReusePrevCol = false;
    
            if (previousCollision) {
                // estimate total motion
                var parentA = bodyA.parent,
                    parentB = bodyB.parent,
                    motion = parentA.speed * parentA.speed + parentA.angularSpeed * parentA.angularSpeed
                           + parentB.speed * parentB.speed + parentB.angularSpeed * parentB.angularSpeed;
    
                // we may be able to (partially) reuse collision result 
                // but only safe if collision was resting
                canReusePrevCol = previousCollision && previousCollision.collided && motion < 0.2;
    
                // reuse collision object
                collision = previousCollision;
            } else {
                collision = { collided: false, bodyA: bodyA, bodyB: bodyB };
            }
    
            if (previousCollision && canReusePrevCol) {
                // if we can reuse the collision result
                // we only need to test the previously found axis
                var axisBodyA = collision.axisBody,
                    axisBodyB = axisBodyA === bodyA ? bodyB : bodyA,
                    axes = [axisBodyA.axes[previousCollision.axisNumber]];
    
                minOverlap = _overlapAxes(axisBodyA.vertices, axisBodyB.vertices, axes);
                collision.reused = true;
    
                if (minOverlap.overlap <= 0) {
                    collision.collided = false;
                    return collision;
                }
            } else {
                // if we can't reuse a result, perform a full SAT test
    
                overlapAB = _overlapAxes(bodyA.vertices, bodyB.vertices, bodyA.axes);
    
                if (overlapAB.overlap <= 0) {
                    collision.collided = false;
                    return collision;
                }
    
                overlapBA = _overlapAxes(bodyB.vertices, bodyA.vertices, bodyB.axes);
    
                if (overlapBA.overlap <= 0) {
                    collision.collided = false;
                    return collision;
                }
    
                if (overlapAB.overlap < overlapBA.overlap) {
                    minOverlap = overlapAB;
                    collision.axisBody = bodyA;
                } else {
                    minOverlap = overlapBA;
                    collision.axisBody = bodyB;
                }
    
                // important for reuse later
                collision.axisNumber = minOverlap.axisNumber;
            }
    
            collision.bodyA = bodyA.id < bodyB.id ? bodyA : bodyB;
            collision.bodyB = bodyA.id < bodyB.id ? bodyB : bodyA;
            collision.collided = true;
            collision.depth = minOverlap.overlap;
            collision.parentA = collision.bodyA.parent;
            collision.parentB = collision.bodyB.parent;
            
            bodyA = collision.bodyA;
            bodyB = collision.bodyB;
    
            // ensure normal is facing away from bodyA
            if (Vector.dot(minOverlap.axis, Vector.sub(bodyB.position, bodyA.position)) < 0) {
                collision.normal = {
                    x: minOverlap.axis.x,
                    y: minOverlap.axis.y
                };
            } else {
                collision.normal = {
                    x: -minOverlap.axis.x,
                    y: -minOverlap.axis.y
                };
            }
    
            collision.tangent = Vector.perp(collision.normal);
    
            collision.penetration = collision.penetration || {};
            collision.penetration.x = collision.normal.x * collision.depth;
            collision.penetration.y = collision.normal.y * collision.depth; 
    
            // find support points, there is always either exactly one or two
            var verticesB = _findSupports(bodyA, bodyB, collision.normal),
                supports = [];
    
            // find the supports from bodyB that are inside bodyA
            if (Vertices.contains(bodyA.vertices, verticesB[0]))
                supports.push(verticesB[0]);
    
            if (Vertices.contains(bodyA.vertices, verticesB[1]))
                supports.push(verticesB[1]);
    
            // find the supports from bodyA that are inside bodyB
            if (supports.length < 2) {
                var verticesA = _findSupports(bodyB, bodyA, Vector.neg(collision.normal));
                    
                if (Vertices.contains(bodyB.vertices, verticesA[0]))
                    supports.push(verticesA[0]);
    
                if (supports.length < 2 && Vertices.contains(bodyB.vertices, verticesA[1]))
                    supports.push(verticesA[1]);
            }
    
            // account for the edge case of overlapping but no vertex containment
            if (supports.length < 1)
                supports = [verticesB[0]];
            
            collision.supports = supports;
    
            return collision;
        };
    
        /**
         * Find the overlap between two sets of vertices.
         * @method _overlapAxes
         * @private
         * @param {} verticesA
         * @param {} verticesB
         * @param {} axes
         * @return result
         */
        var _overlapAxes = function(verticesA, verticesB, axes) {
            var projectionA = Vector._temp[0], 
                projectionB = Vector._temp[1],
                result = { overlap: Number.MAX_VALUE },
                overlap,
                axis;
    
            for (var i = 0; i < axes.length; i++) {
                axis = axes[i];
    
                _projectToAxis(projectionA, verticesA, axis);
                _projectToAxis(projectionB, verticesB, axis);
    
                overlap = Math.min(projectionA.max - projectionB.min, projectionB.max - projectionA.min);
    
                if (overlap <= 0) {
                    result.overlap = overlap;
                    return result;
                }
    
                if (overlap < result.overlap) {
                    result.overlap = overlap;
                    result.axis = axis;
                    result.axisNumber = i;
                }
            }
    
            return result;
        };
    
        /**
         * Projects vertices on an axis and returns an interval.
         * @method _projectToAxis
         * @private
         * @param {} projection
         * @param {} vertices
         * @param {} axis
         */
        var _projectToAxis = function(projection, vertices, axis) {
            var min = Vector.dot(vertices[0], axis),
                max = min;
    
            for (var i = 1; i < vertices.length; i += 1) {
                var dot = Vector.dot(vertices[i], axis);
    
                if (dot > max) { 
                    max = dot; 
                } else if (dot < min) { 
                    min = dot; 
                }
            }
    
            projection.min = min;
            projection.max = max;
        };
        
        /**
         * Finds supporting vertices given two bodies along a given direction using hill-climbing.
         * @method _findSupports
         * @private
         * @param {} bodyA
         * @param {} bodyB
         * @param {} normal
         * @return [vector]
         */
        var _findSupports = function(bodyA, bodyB, normal) {
            var nearestDistance = Number.MAX_VALUE,
                vertexToBody = Vector._temp[0],
                vertices = bodyB.vertices,
                bodyAPosition = bodyA.position,
                distance,
                vertex,
                vertexA,
                vertexB;
    
            // find closest vertex on bodyB
            for (var i = 0; i < vertices.length; i++) {
                vertex = vertices[i];
                vertexToBody.x = vertex.x - bodyAPosition.x;
                vertexToBody.y = vertex.y - bodyAPosition.y;
                distance = -Vector.dot(normal, vertexToBody);
    
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    vertexA = vertex;
                }
            }
    
            // find next closest vertex using the two connected to it
            var prevIndex = vertexA.index - 1 >= 0 ? vertexA.index - 1 : vertices.length - 1;
            vertex = vertices[prevIndex];
            vertexToBody.x = vertex.x - bodyAPosition.x;
            vertexToBody.y = vertex.y - bodyAPosition.y;
            nearestDistance = -Vector.dot(normal, vertexToBody);
            vertexB = vertex;
    
            var nextIndex = (vertexA.index + 1) % vertices.length;
            vertex = vertices[nextIndex];
            vertexToBody.x = vertex.x - bodyAPosition.x;
            vertexToBody.y = vertex.y - bodyAPosition.y;
            distance = -Vector.dot(normal, vertexToBody);
            if (distance < nearestDistance) {
                vertexB = vertex;
            }
    
            return [vertexA, vertexB];
        };
    
    })();
    
    },{"../geometry/Vector":28,"../geometry/Vertices":29}],12:[function(_dereq_,module,exports){
    /**
    * The `Matter.Constraint` module contains methods for creating and manipulating constraints.
    * Constraints are used for specifying that a fixed distance must be maintained between two bodies (or a body and a fixed world-space position).
    * The stiffness of constraints can be modified to create springs or elastic.
    *
    * See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
    *
    * @class Constraint
    */
    
    // TODO: fix instability issues with torque
    // TODO: linked constraints
    // TODO: breakable constraints
    // TODO: collision constraints
    // TODO: allow constrained bodies to sleep
    // TODO: handle 0 length constraints properly
    // TODO: impulse caching and warming
    
    var Constraint = {};
    
    module.exports = Constraint;
    
    var Vertices = _dereq_('../geometry/Vertices');
    var Vector = _dereq_('../geometry/Vector');
    var Sleeping = _dereq_('../core/Sleeping');
    var Bounds = _dereq_('../geometry/Bounds');
    var Axes = _dereq_('../geometry/Axes');
    var Common = _dereq_('../core/Common');
    
    (function() {
    
        var _minLength = 0.000001,
            _minDifference = 0.001;
    
        /**
         * Creates a new constraint.
         * All properties have default values, and many are pre-calculated automatically based on other properties.
         * See the properties section below for detailed information on what you can pass via the `options` object.
         * @method create
         * @param {} options
         * @return {constraint} constraint
         */
        Constraint.create = function(options) {
            var constraint = options;
    
            // if bodies defined but no points, use body centre
            if (constraint.bodyA && !constraint.pointA)
                constraint.pointA = { x: 0, y: 0 };
            if (constraint.bodyB && !constraint.pointB)
                constraint.pointB = { x: 0, y: 0 };
    
            // calculate static length using initial world space points
            var initialPointA = constraint.bodyA ? Vector.add(constraint.bodyA.position, constraint.pointA) : constraint.pointA,
                initialPointB = constraint.bodyB ? Vector.add(constraint.bodyB.position, constraint.pointB) : constraint.pointB,
                length = Vector.magnitude(Vector.sub(initialPointA, initialPointB));
        
            constraint.length = constraint.length || length || _minLength;
    
            // render
            var render = {
                visible: true,
                lineWidth: 2,
                strokeStyle: '#ffffff'
            };
            
            constraint.render = Common.extend(render, constraint.render);
    
            // option defaults
            constraint.id = constraint.id || Common.nextId();
            constraint.label = constraint.label || 'Constraint';
            constraint.type = 'constraint';
            constraint.stiffness = constraint.stiffness || 1;
            constraint.angularStiffness = constraint.angularStiffness || 0;
            constraint.angleA = constraint.bodyA ? constraint.bodyA.angle : constraint.angleA;
            constraint.angleB = constraint.bodyB ? constraint.bodyB.angle : constraint.angleB;
            constraint.plugin = {};
    
            return constraint;
        };
    
        /**
         * Solves all constraints in a list of collisions.
         * @private
         * @method solveAll
         * @param {constraint[]} constraints
         * @param {number} timeScale
         */
        Constraint.solveAll = function(constraints, timeScale) {
            for (var i = 0; i < constraints.length; i++) {
                Constraint.solve(constraints[i], timeScale);
            }
        };
    
        /**
         * Solves a distance constraint with Gauss-Siedel method.
         * @private
         * @method solve
         * @param {constraint} constraint
         * @param {number} timeScale
         */
        Constraint.solve = function(constraint, timeScale) {
            var bodyA = constraint.bodyA,
                bodyB = constraint.bodyB,
                pointA = constraint.pointA,
                pointB = constraint.pointB;
    
            // update reference angle
            if (bodyA && !bodyA.isStatic) {
                constraint.pointA = Vector.rotate(pointA, bodyA.angle - constraint.angleA);
                constraint.angleA = bodyA.angle;
            }
            
            // update reference angle
            if (bodyB && !bodyB.isStatic) {
                constraint.pointB = Vector.rotate(pointB, bodyB.angle - constraint.angleB);
                constraint.angleB = bodyB.angle;
            }
    
            var pointAWorld = pointA,
                pointBWorld = pointB;
    
            if (bodyA) pointAWorld = Vector.add(bodyA.position, pointA);
            if (bodyB) pointBWorld = Vector.add(bodyB.position, pointB);
    
            if (!pointAWorld || !pointBWorld)
                return;
    
            var delta = Vector.sub(pointAWorld, pointBWorld),
                currentLength = Vector.magnitude(delta);
    
            // prevent singularity
            if (currentLength === 0)
                currentLength = _minLength;
    
            // solve distance constraint with Gauss-Siedel method
            var difference = (currentLength - constraint.length) / currentLength,
                normal = Vector.div(delta, currentLength),
                force = Vector.mult(delta, difference * 0.5 * constraint.stiffness * timeScale * timeScale);
            
            // if difference is very small, we can skip
            if (Math.abs(1 - (currentLength / constraint.length)) < _minDifference * timeScale)
                return;
    
            var velocityPointA,
                velocityPointB,
                offsetA,
                offsetB,
                oAn,
                oBn,
                bodyADenom,
                bodyBDenom;
        
            if (bodyA && !bodyA.isStatic) {
                // point body offset
                offsetA = { 
                    x: pointAWorld.x - bodyA.position.x + force.x, 
                    y: pointAWorld.y - bodyA.position.y + force.y
                };
                
                // update velocity
                bodyA.velocity.x = bodyA.position.x - bodyA.positionPrev.x;
                bodyA.velocity.y = bodyA.position.y - bodyA.positionPrev.y;
                bodyA.angularVelocity = bodyA.angle - bodyA.anglePrev;
                
                // find point velocity and body mass
                velocityPointA = Vector.add(bodyA.velocity, Vector.mult(Vector.perp(offsetA), bodyA.angularVelocity));
                oAn = Vector.dot(offsetA, normal);
                bodyADenom = bodyA.inverseMass + bodyA.inverseInertia * oAn * oAn;
            } else {
                velocityPointA = { x: 0, y: 0 };
                bodyADenom = bodyA ? bodyA.inverseMass : 0;
            }
                
            if (bodyB && !bodyB.isStatic) {
                // point body offset
                offsetB = { 
                    x: pointBWorld.x - bodyB.position.x - force.x, 
                    y: pointBWorld.y - bodyB.position.y - force.y 
                };
                
                // update velocity
                bodyB.velocity.x = bodyB.position.x - bodyB.positionPrev.x;
                bodyB.velocity.y = bodyB.position.y - bodyB.positionPrev.y;
                bodyB.angularVelocity = bodyB.angle - bodyB.anglePrev;
    
                // find point velocity and body mass
                velocityPointB = Vector.add(bodyB.velocity, Vector.mult(Vector.perp(offsetB), bodyB.angularVelocity));
                oBn = Vector.dot(offsetB, normal);
                bodyBDenom = bodyB.inverseMass + bodyB.inverseInertia * oBn * oBn;
            } else {
                velocityPointB = { x: 0, y: 0 };
                bodyBDenom = bodyB ? bodyB.inverseMass : 0;
            }
            
            var relativeVelocity = Vector.sub(velocityPointB, velocityPointA),
                normalImpulse = Vector.dot(normal, relativeVelocity) / (bodyADenom + bodyBDenom);
        
            if (normalImpulse > 0) normalImpulse = 0;
        
            var normalVelocity = {
                x: normal.x * normalImpulse, 
                y: normal.y * normalImpulse
            };
    
            var torque;
     
            if (bodyA && !bodyA.isStatic) {
                torque = Vector.cross(offsetA, normalVelocity) * bodyA.inverseInertia * (1 - constraint.angularStiffness);
    
                // keep track of applied impulses for post solving
                bodyA.constraintImpulse.x -= force.x;
                bodyA.constraintImpulse.y -= force.y;
                bodyA.constraintImpulse.angle += torque;
    
                // apply forces
                bodyA.position.x -= force.x;
                bodyA.position.y -= force.y;
                bodyA.angle += torque;
            }
    
            if (bodyB && !bodyB.isStatic) {
                torque = Vector.cross(offsetB, normalVelocity) * bodyB.inverseInertia * (1 - constraint.angularStiffness);
    
                // keep track of applied impulses for post solving
                bodyB.constraintImpulse.x += force.x;
                bodyB.constraintImpulse.y += force.y;
                bodyB.constraintImpulse.angle -= torque;
                
                // apply forces
                bodyB.position.x += force.x;
                bodyB.position.y += force.y;
                bodyB.angle -= torque;
            }
    
        };
    
        /**
         * Performs body updates required after solving constraints.
         * @private
         * @method postSolveAll
         * @param {body[]} bodies
         */
        Constraint.postSolveAll = function(bodies) {
            for (var i = 0; i < bodies.length; i++) {
                var body = bodies[i],
                    impulse = body.constraintImpulse;
    
                if (impulse.x === 0 && impulse.y === 0 && impulse.angle === 0) {
                    continue;
                }
    
                Sleeping.set(body, false);
    
                // update geometry and reset
                for (var j = 0; j < body.parts.length; j++) {
                    var part = body.parts[j];
                    
                    Vertices.translate(part.vertices, impulse);
    
                    if (j > 0) {
                        part.position.x += impulse.x;
                        part.position.y += impulse.y;
                    }
    
                    if (impulse.angle !== 0) {
                        Vertices.rotate(part.vertices, impulse.angle, body.position);
                        Axes.rotate(part.axes, impulse.angle);
                        if (j > 0) {
                            Vector.rotateAbout(part.position, impulse.angle, body.position, part.position);
                        }
                    }
    
                    Bounds.update(part.bounds, part.vertices, body.velocity);
                }
    
                impulse.angle = 0;
                impulse.x = 0;
                impulse.y = 0;
            }
        };
    
        /*
        *
        *  Properties Documentation
        *
        */
    
        /**
         * An integer `Number` uniquely identifying number generated in `Composite.create` by `Common.nextId`.
         *
         * @property id
         * @type number
         */
    
        /**
         * A `String` denoting the type of object.
         *
         * @property type
         * @type string
         * @default "constraint"
         * @readOnly
         */
    
        /**
         * An arbitrary `String` name to help the user identify and manage bodies.
         *
         * @property label
         * @type string
         * @default "Constraint"
         */
    
        /**
         * An `Object` that defines the rendering properties to be consumed by the module `Matter.Render`.
         *
         * @property render
         * @type object
         */
    
        /**
         * A flag that indicates if the constraint should be rendered.
         *
         * @property render.visible
         * @type boolean
         * @default true
         */
    
        /**
         * A `Number` that defines the line width to use when rendering the constraint outline.
         * A value of `0` means no outline will be rendered.
         *
         * @property render.lineWidth
         * @type number
         * @default 2
         */
    
        /**
         * A `String` that defines the stroke style to use when rendering the constraint outline.
         * It is the same as when using a canvas, so it accepts CSS style property values.
         *
         * @property render.strokeStyle
         * @type string
         * @default a random colour
         */
    
        /**
         * The first possible `Body` that this constraint is attached to.
         *
         * @property bodyA
         * @type body
         * @default null
         */
    
        /**
         * The second possible `Body` that this constraint is attached to.
         *
         * @property bodyB
         * @type body
         * @default null
         */
    
        /**
         * A `Vector` that specifies the offset of the constraint from center of the `constraint.bodyA` if defined, otherwise a world-space position.
         *
         * @property pointA
         * @type vector
         * @default { x: 0, y: 0 }
         */
    
        /**
         * A `Vector` that specifies the offset of the constraint from center of the `constraint.bodyA` if defined, otherwise a world-space position.
         *
         * @property pointB
         * @type vector
         * @default { x: 0, y: 0 }
         */
    
        /**
         * A `Number` that specifies the stiffness of the constraint, i.e. the rate at which it returns to its resting `constraint.length`.
         * A value of `1` means the constraint should be very stiff.
         * A value of `0.2` means the constraint acts like a soft spring.
         *
         * @property stiffness
         * @type number
         * @default 1
         */
    
        /**
         * A `Number` that specifies the target resting length of the constraint. 
         * It is calculated automatically in `Constraint.create` from initial positions of the `constraint.bodyA` and `constraint.bodyB`.
         *
         * @property length
         * @type number
         */
    
        /**
         * An object reserved for storing plugin-specific properties.
         *
         * @property plugin
         * @type {}
         */
    
    })();
    
    },{"../core/Common":14,"../core/Sleeping":22,"../geometry/Axes":25,"../geometry/Bounds":26,"../geometry/Vector":28,"../geometry/Vertices":29}],13:[function(_dereq_,module,exports){
    /**
    * The `Matter.MouseConstraint` module contains methods for creating mouse constraints.
    * Mouse constraints are used for allowing user interaction, providing the ability to move bodies via the mouse or touch.
    *
    * See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
    *
    * @class MouseConstraint
    */
    
    var MouseConstraint = {};
    
    module.exports = MouseConstraint;
    
    var Vertices = _dereq_('../geometry/Vertices');
    var Sleeping = _dereq_('../core/Sleeping');
    var Mouse = _dereq_('../core/Mouse');
    var Events = _dereq_('../core/Events');
    var Detector = _dereq_('../collision/Detector');
    var Constraint = _dereq_('./Constraint');
    var Composite = _dereq_('../body/Composite');
    var Common = _dereq_('../core/Common');
    var Bounds = _dereq_('../geometry/Bounds');
    
    (function() {
    
        /**
         * Creates a new mouse constraint.
         * All properties have default values, and many are pre-calculated automatically based on other properties.
         * See the properties section below for detailed information on what you can pass via the `options` object.
         * @method create
         * @param {engine} engine
         * @param {} options
         * @return {MouseConstraint} A new MouseConstraint
         */
        MouseConstraint.create = function(engine, options) {
            var mouse = (engine ? engine.mouse : null) || (options ? options.mouse : null);
    
            if (!mouse) {
                if (engine && engine.render && engine.render.canvas) {
                    mouse = Mouse.create(engine.render.canvas);
                } else if (options && options.element) {
                    mouse = Mouse.create(options.element);
                } else {
                    mouse = Mouse.create();
                    Common.warn('MouseConstraint.create: options.mouse was undefined, options.element was undefined, may not function as expected');
                }
            }
    
            var constraint = Constraint.create({ 
                label: 'Mouse Constraint',
                pointA: mouse.position,
                pointB: { x: 0, y: 0 },
                length: 0.01, 
                stiffness: 0.1,
                angularStiffness: 1,
                render: {
                    strokeStyle: '#90EE90',
                    lineWidth: 3
                }
            });
    
            var defaults = {
                type: 'mouseConstraint',
                mouse: mouse,
                element: null,
                body: null,
                constraint: constraint,
                collisionFilter: {
                    category: 0x0001,
                    mask: 0xFFFFFFFF,
                    group: 0
                }
            };
    
            var mouseConstraint = Common.extend(defaults, options);
    
            Events.on(engine, 'beforeUpdate', function() {
                var allBodies = Composite.allBodies(engine.world);
                MouseConstraint.update(mouseConstraint, allBodies);
                _triggerEvents(mouseConstraint);
            });
    
            return mouseConstraint;
        };
    
        /**
         * Updates the given mouse constraint.
         * @private
         * @method update
         * @param {MouseConstraint} mouseConstraint
         * @param {body[]} bodies
         */
        MouseConstraint.update = function(mouseConstraint, bodies) {
            var mouse = mouseConstraint.mouse,
                constraint = mouseConstraint.constraint,
                body = mouseConstraint.body;
    
            if (mouse.button === 0) {
                if (!constraint.bodyB) {
                    for (var i = 0; i < bodies.length; i++) {
                        body = bodies[i];
                        if (Bounds.contains(body.bounds, mouse.position) 
                                && Detector.canCollide(body.collisionFilter, mouseConstraint.collisionFilter)) {
                            for (var j = body.parts.length > 1 ? 1 : 0; j < body.parts.length; j++) {
                                var part = body.parts[j];
                                if (Vertices.contains(part.vertices, mouse.position)) {
                                    constraint.pointA = mouse.position;
                                    constraint.bodyB = mouseConstraint.body = body;
                                    constraint.pointB = { x: mouse.position.x - body.position.x, y: mouse.position.y - body.position.y };
                                    constraint.angleB = body.angle;
    
                                    Sleeping.set(body, false);
                                    Events.trigger(mouseConstraint, 'startdrag', { mouse: mouse, body: body });
    
                                    break;
                                }
                            }
                        }
                    }
                } else {
                    Sleeping.set(constraint.bodyB, false);
                    constraint.pointA = mouse.position;
                }
            } else {
                constraint.bodyB = mouseConstraint.body = null;
                constraint.pointB = null;
    
                if (body)
                    Events.trigger(mouseConstraint, 'enddrag', { mouse: mouse, body: body });
            }
        };
    
        /**
         * Triggers mouse constraint events.
         * @method _triggerEvents
         * @private
         * @param {mouse} mouseConstraint
         */
        var _triggerEvents = function(mouseConstraint) {
            var mouse = mouseConstraint.mouse,
                mouseEvents = mouse.sourceEvents;
    
            if (mouseEvents.mousemove)
                Events.trigger(mouseConstraint, 'mousemove', { mouse: mouse });
    
            if (mouseEvents.mousedown)
                Events.trigger(mouseConstraint, 'mousedown', { mouse: mouse });
    
            if (mouseEvents.mouseup)
                Events.trigger(mouseConstraint, 'mouseup', { mouse: mouse });
    
            // reset the mouse state ready for the next step
            Mouse.clearSourceEvents(mouse);
        };
    
        /*
        *
        *  Events Documentation
        *
        */
    
        /**
        * Fired when the mouse has moved (or a touch moves) during the last step
        *
        * @event mousemove
        * @param {} event An event object
        * @param {mouse} event.mouse The engine's mouse instance
        * @param {} event.source The source object of the event
        * @param {} event.name The name of the event
        */
    
        /**
        * Fired when the mouse is down (or a touch has started) during the last step
        *
        * @event mousedown
        * @param {} event An event object
        * @param {mouse} event.mouse The engine's mouse instance
        * @param {} event.source The source object of the event
        * @param {} event.name The name of the event
        */
    
        /**
        * Fired when the mouse is up (or a touch has ended) during the last step
        *
        * @event mouseup
        * @param {} event An event object
        * @param {mouse} event.mouse The engine's mouse instance
        * @param {} event.source The source object of the event
        * @param {} event.name The name of the event
        */
    
        /**
        * Fired when the user starts dragging a body
        *
        * @event startdrag
        * @param {} event An event object
        * @param {mouse} event.mouse The engine's mouse instance
        * @param {body} event.body The body being dragged
        * @param {} event.source The source object of the event
        * @param {} event.name The name of the event
        */
    
        /**
        * Fired when the user ends dragging a body
        *
        * @event enddrag
        * @param {} event An event object
        * @param {mouse} event.mouse The engine's mouse instance
        * @param {body} event.body The body that has stopped being dragged
        * @param {} event.source The source object of the event
        * @param {} event.name The name of the event
        */
    
        /*
        *
        *  Properties Documentation
        *
        */
    
        /**
         * A `String` denoting the type of object.
         *
         * @property type
         * @type string
         * @default "constraint"
         * @readOnly
         */
    
        /**
         * The `Mouse` instance in use. If not supplied in `MouseConstraint.create`, one will be created.
         *
         * @property mouse
         * @type mouse
         * @default mouse
         */
    
        /**
         * The `Body` that is currently being moved by the user, or `null` if no body.
         *
         * @property body
         * @type body
         * @default null
         */
    
        /**
         * The `Constraint` object that is used to move the body during interaction.
         *
         * @property constraint
         * @type constraint
         */
    
        /**
         * An `Object` that specifies the collision filter properties.
         * The collision filter allows the user to define which types of body this mouse constraint can interact with.
         * See `body.collisionFilter` for more information.
         *
         * @property collisionFilter
         * @type object
         */
    
    })();
    
    },{"../body/Composite":2,"../collision/Detector":5,"../core/Common":14,"../core/Events":16,"../core/Mouse":19,"../core/Sleeping":22,"../geometry/Bounds":26,"../geometry/Vertices":29,"./Constraint":12}],14:[function(_dereq_,module,exports){
    /**
    * The `Matter.Common` module contains utility functions that are common to all modules.
    *
    * @class Common
    */
    
    var Common = {};
    
    module.exports = Common;
    
    (function() {
    
        Common._nextId = 0;
        Common._seed = 0;
    
        /**
         * Extends the object in the first argument using the object in the second argument.
         * @method extend
         * @param {} obj
         * @param {boolean} deep
         * @return {} obj extended
         */
        Common.extend = function(obj, deep) {
            var argsStart,
                args,
                deepClone;
    
            if (typeof deep === 'boolean') {
                argsStart = 2;
                deepClone = deep;
            } else {
                argsStart = 1;
                deepClone = true;
            }
    
            for (var i = argsStart; i < arguments.length; i++) {
                var source = arguments[i];
    
                if (source) {
                    for (var prop in source) {
                        if (deepClone && source[prop] && source[prop].constructor === Object) {
                            if (!obj[prop] || obj[prop].constructor === Object) {
                                obj[prop] = obj[prop] || {};
                                Common.extend(obj[prop], deepClone, source[prop]);
                            } else {
                                obj[prop] = source[prop];
                            }
                        } else {
                            obj[prop] = source[prop];
                        }
                    }
                }
            }
            
            return obj;
        };
    
        /**
         * Creates a new clone of the object, if deep is true references will also be cloned.
         * @method clone
         * @param {} obj
         * @param {bool} deep
         * @return {} obj cloned
         */
        Common.clone = function(obj, deep) {
            return Common.extend({}, deep, obj);
        };
    
        /**
         * Returns the list of keys for the given object.
         * @method keys
         * @param {} obj
         * @return {string[]} keys
         */
        Common.keys = function(obj) {
            if (Object.keys)
                return Object.keys(obj);
    
            // avoid hasOwnProperty for performance
            var keys = [];
            for (var key in obj)
                keys.push(key);
            return keys;
        };
    
        /**
         * Returns the list of values for the given object.
         * @method values
         * @param {} obj
         * @return {array} Array of the objects property values
         */
        Common.values = function(obj) {
            var values = [];
            
            if (Object.keys) {
                var keys = Object.keys(obj);
                for (var i = 0; i < keys.length; i++) {
                    values.push(obj[keys[i]]);
                }
                return values;
            }
            
            // avoid hasOwnProperty for performance
            for (var key in obj)
                values.push(obj[key]);
            return values;
        };
    
        /**
         * Gets a value from `base` relative to the `path` string.
         * @method get
         * @param {} obj The base object
         * @param {string} path The path relative to `base`, e.g. 'Foo.Bar.baz'
         * @param {number} [begin] Path slice begin
         * @param {number} [end] Path slice end
         * @return {} The object at the given path
         */
        Common.get = function(obj, path, begin, end) {
            path = path.split('.').slice(begin, end);
    
            for (var i = 0; i < path.length; i += 1) {
                obj = obj[path[i]];
            }
    
            return obj;
        };
    
        /**
         * Sets a value on `base` relative to the given `path` string.
         * @method set
         * @param {} obj The base object
         * @param {string} path The path relative to `base`, e.g. 'Foo.Bar.baz'
         * @param {} val The value to set
         * @param {number} [begin] Path slice begin
         * @param {number} [end] Path slice end
         * @return {} Pass through `val` for chaining
         */
        Common.set = function(obj, path, val, begin, end) {
            var parts = path.split('.').slice(begin, end);
            Common.get(obj, path, 0, -1)[parts[parts.length - 1]] = val;
            return val;
        };
    
        /**
         * Returns a hex colour string made by lightening or darkening color by percent.
         * @method shadeColor
         * @param {string} color
         * @param {number} percent
         * @return {string} A hex colour
         */
        Common.shadeColor = function(color, percent) {   
            // http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color
            var colorInteger = parseInt(color.slice(1),16), 
                amount = Math.round(2.55 * percent), 
                R = (colorInteger >> 16) + amount, 
                B = (colorInteger >> 8 & 0x00FF) + amount, 
                G = (colorInteger & 0x0000FF) + amount;
            return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R :255) * 0x10000 
                    + (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 
                    + (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
        };
    
        /**
         * Shuffles the given array in-place.
         * The function uses a seeded random generator.
         * @method shuffle
         * @param {array} array
         * @return {array} array shuffled randomly
         */
        Common.shuffle = function(array) {
            for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(Common.random() * (i + 1));
                var temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
            return array;
        };
    
        /**
         * Randomly chooses a value from a list with equal probability.
         * The function uses a seeded random generator.
         * @method choose
         * @param {array} choices
         * @return {object} A random choice object from the array
         */
        Common.choose = function(choices) {
            return choices[Math.floor(Common.random() * choices.length)];
        };
    
        /**
         * Returns true if the object is a HTMLElement, otherwise false.
         * @method isElement
         * @param {object} obj
         * @return {boolean} True if the object is a HTMLElement, otherwise false
         */
        Common.isElement = function(obj) {
            // http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
            try {
                return obj instanceof HTMLElement;
            }
            catch(e){
                return (typeof obj==="object") &&
                  (obj.nodeType===1) && (typeof obj.style === "object") &&
                  (typeof obj.ownerDocument ==="object");
            }
        };
    
        /**
         * Returns true if the object is an array.
         * @method isArray
         * @param {object} obj
         * @return {boolean} True if the object is an array, otherwise false
         */
        Common.isArray = function(obj) {
            return Object.prototype.toString.call(obj) === '[object Array]';
        };
    
        /**
         * Returns true if the object is a function.
         * @method isFunction
         * @param {object} obj
         * @return {boolean} True if the object is a function, otherwise false
         */
        Common.isFunction = function(obj) {
            return typeof obj === "function";
        };
    
        /**
         * Returns true if the object is a plain object.
         * @method isPlainObject
         * @param {object} obj
         * @return {boolean} True if the object is a plain object, otherwise false
         */
        Common.isPlainObject = function(obj) {
            return typeof obj === 'object' && obj.constructor === Object;
        };
    
        /**
         * Returns true if the object is a string.
         * @method isString
         * @param {object} obj
         * @return {boolean} True if the object is a string, otherwise false
         */
        Common.isString = function(obj) {
            return toString.call(obj) === '[object String]';
        };
        
        /**
         * Returns the given value clamped between a minimum and maximum value.
         * @method clamp
         * @param {number} value
         * @param {number} min
         * @param {number} max
         * @return {number} The value clamped between min and max inclusive
         */
        Common.clamp = function(value, min, max) {
            if (value < min)
                return min;
            if (value > max)
                return max;
            return value;
        };
        
        /**
         * Returns the sign of the given value.
         * @method sign
         * @param {number} value
         * @return {number} -1 if negative, +1 if 0 or positive
         */
        Common.sign = function(value) {
            return value < 0 ? -1 : 1;
        };
        
        /**
         * Returns the current timestamp (high-res if available).
         * @method now
         * @return {number} the current timestamp (high-res if available)
         */
        Common.now = function() {
            // http://stackoverflow.com/questions/221294/how-do-you-get-a-timestamp-in-javascript
            // https://gist.github.com/davidwaterston/2982531
    
            var performance = window.performance || {};
    
            performance.now = (function() {
                return performance.now    ||
                performance.webkitNow     ||
                performance.msNow         ||
                performance.oNow          ||
                performance.mozNow        ||
                function() { return +(new Date()); };
            })();
                  
            return performance.now();
        };
        
        /**
         * Returns a random value between a minimum and a maximum value inclusive.
         * The function uses a seeded random generator.
         * @method random
         * @param {number} min
         * @param {number} max
         * @return {number} A random number between min and max inclusive
         */
        Common.random = function(min, max) {
            min = (typeof min !== "undefined") ? min : 0;
            max = (typeof max !== "undefined") ? max : 1;
            return min + _seededRandom() * (max - min);
        };
    
        var _seededRandom = function() {
            // https://gist.github.com/ngryman/3830489
            Common._seed = (Common._seed * 9301 + 49297) % 233280;
            return Common._seed / 233280;
        };
    
        /**
         * Converts a CSS hex colour string into an integer.
         * @method colorToNumber
         * @param {string} colorString
         * @return {number} An integer representing the CSS hex string
         */
        Common.colorToNumber = function(colorString) {
            colorString = colorString.replace('#','');
    
            if (colorString.length == 3) {
                colorString = colorString.charAt(0) + colorString.charAt(0)
                            + colorString.charAt(1) + colorString.charAt(1)
                            + colorString.charAt(2) + colorString.charAt(2);
            }
    
            return parseInt(colorString, 16);
        };
    
        /**
         * The console logging level to use, where each level includes all levels above and excludes the levels below.
         * The default level is 'debug' which shows all console messages.  
         *
         * Possible level values are:
         * - 0 = None
         * - 1 = Debug
         * - 2 = Info
         * - 3 = Warn
         * - 4 = Error
         * @property Common.logLevel
         * @type {Number}
         * @default 1
         */
        Common.logLevel = 1;
    
        /**
         * Shows a `console.log` message only if the current `Common.logLevel` allows it.
         * The message will be prefixed with 'matter-js' to make it easily identifiable.
         * @method log
         * @param ...objs {} The objects to log.
         */
        Common.log = function() {
            if (console && Common.logLevel > 0 && Common.logLevel <= 3) {
                console.log.apply(console, ['matter-js:'].concat(Array.prototype.slice.call(arguments)));
            }
        };
    
        /**
         * Shows a `console.info` message only if the current `Common.logLevel` allows it.
         * The message will be prefixed with 'matter-js' to make it easily identifiable.
         * @method info
         * @param ...objs {} The objects to log.
         */
        Common.info = function() {
            if (console && Common.logLevel > 0 && Common.logLevel <= 2) {
                console.info.apply(console, ['matter-js:'].concat(Array.prototype.slice.call(arguments)));
            }
        };
    
        /**
         * Shows a `console.warn` message only if the current `Common.logLevel` allows it.
         * The message will be prefixed with 'matter-js' to make it easily identifiable.
         * @method warn
         * @param ...objs {} The objects to log.
         */
        Common.warn = function() {
            if (console && Common.logLevel > 0 && Common.logLevel <= 3) {
                console.warn.apply(console, ['matter-js:'].concat(Array.prototype.slice.call(arguments)));
            }
        };
    
        /**
         * Returns the next unique sequential ID.
         * @method nextId
         * @return {Number} Unique sequential ID
         */
        Common.nextId = function() {
            return Common._nextId++;
        };
    
        /**
         * A cross browser compatible indexOf implementation.
         * @method indexOf
         * @param {array} haystack
         * @param {object} needle
         * @return {number} The position of needle in haystack, otherwise -1.
         */
        Common.indexOf = function(haystack, needle) {
            if (haystack.indexOf)
                return haystack.indexOf(needle);
    
            for (var i = 0; i < haystack.length; i++) {
                if (haystack[i] === needle)
                    return i;
            }
    
            return -1;
        };
    
        /**
         * A cross browser compatible array map implementation.
         * @method map
         * @param {array} list
         * @param {function} func
         * @return {array} Values from list transformed by func.
         */
        Common.map = function(list, func) {
            if (list.map) {
                return list.map(func);
            }
    
            var mapped = [];
    
            for (var i = 0; i < list.length; i += 1) {
                mapped.push(func(list[i]));
            }
    
            return mapped;
        };
    
        /**
         * Takes a directed graph and returns the partially ordered set of vertices in topological order.
         * Circular dependencies are allowed.
         * @method topologicalSort
         * @param {object} graph
         * @return {array} Partially ordered set of vertices in topological order.
         */
        Common.topologicalSort = function(graph) {
            // https://mgechev.github.io/javascript-algorithms/graphs_others_topological-sort.js.html
            var result = [],
                visited = [],
                temp = [];
    
            for (var node in graph) {
                if (!visited[node] && !temp[node]) {
                    _topologicalSort(node, visited, temp, graph, result);
                }
            }
    
            return result;
        };
    
        var _topologicalSort = function(node, visited, temp, graph, result) {
            var neighbors = graph[node] || [];
            temp[node] = true;
    
            for (var i = 0; i < neighbors.length; i += 1) {
                var neighbor = neighbors[i];
    
                if (temp[neighbor]) {
                    // skip circular dependencies
                    continue;
                }
    
                if (!visited[neighbor]) {
                    _topologicalSort(neighbor, visited, temp, graph, result);
                }
            }
    
            temp[node] = false;
            visited[node] = true;
    
            result.push(node);
        };
    
        /**
         * Takes _n_ functions as arguments and returns a new function that calls them in order.
         * The arguments applied when calling the new function will also be applied to every function passed.
         * The value of `this` refers to the last value returned in the chain that was not `undefined`.
         * Therefore if a passed function does not return a value, the previously returned value is maintained.
         * After all passed functions have been called the new function returns the last returned value (if any).
         * If any of the passed functions are a chain, then the chain will be flattened.
         * @method chain
         * @param ...funcs {function} The functions to chain.
         * @return {function} A new function that calls the passed functions in order.
         */
        Common.chain = function() {
            var funcs = [];
    
            for (var i = 0; i < arguments.length; i += 1) {
                var func = arguments[i];
    
                if (func._chained) {
                    // flatten already chained functions
                    funcs.push.apply(funcs, func._chained);
                } else {
                    funcs.push(func);
                }
            }
    
            var chain = function() {
                // https://github.com/GoogleChrome/devtools-docs/issues/53#issuecomment-51941358
                var lastResult,
                    args = new Array(arguments.length);
    
                for (var i = 0, l = arguments.length; i < l; i++) {
                    args[i] = arguments[i];
                }
    
                for (i = 0; i < funcs.length; i += 1) {
                    var result = funcs[i].apply(lastResult, args);
    
                    if (typeof result !== 'undefined') {
                        lastResult = result;
                    }
                }
    
                return lastResult;
            };
    
            chain._chained = funcs;
    
            return chain;
        };
    
        /**
         * Chains a function to excute before the original function on the given `path` relative to `base`.
         * See also docs for `Common.chain`.
         * @method chainPathBefore
         * @param {} base The base object
         * @param {string} path The path relative to `base`
         * @param {function} func The function to chain before the original
         * @return {function} The chained function that replaced the original
         */
        Common.chainPathBefore = function(base, path, func) {
            return Common.set(base, path, Common.chain(
                func,
                Common.get(base, path)
            ));
        };
    
        /**
         * Chains a function to excute after the original function on the given `path` relative to `base`.
         * See also docs for `Common.chain`.
         * @method chainPathAfter
         * @param {} base The base object
         * @param {string} path The path relative to `base`
         * @param {function} func The function to chain after the original
         * @return {function} The chained function that replaced the original
         */
        Common.chainPathAfter = function(base, path, func) {
            return Common.set(base, path, Common.chain(
                Common.get(base, path),
                func
            ));
        };
    
    })();
    
    },{}],15:[function(_dereq_,module,exports){
    /**
    * The `Matter.Engine` module contains methods for creating and manipulating engines.
    * An engine is a controller that manages updating the simulation of the world.
    * See `Matter.Runner` for an optional game loop utility.
    *
    * See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
    *
    * @class Engine
    */
    
    var Engine = {};
    
    module.exports = Engine;
    
    var World = _dereq_('../body/World');
    var Sleeping = _dereq_('./Sleeping');
    var Resolver = _dereq_('../collision/Resolver');
    var Render = _dereq_('../render/Render');
    var Pairs = _dereq_('../collision/Pairs');
    var Metrics = _dereq_('./Metrics');
    var Grid = _dereq_('../collision/Grid');
    var Events = _dereq_('./Events');
    var Composite = _dereq_('../body/Composite');
    var Constraint = _dereq_('../constraint/Constraint');
    var Common = _dereq_('./Common');
    var Body = _dereq_('../body/Body');
    
    (function() {
    
        /**
         * Creates a new engine. The options parameter is an object that specifies any properties you wish to override the defaults.
         * All properties have default values, and many are pre-calculated automatically based on other properties.
         * See the properties section below for detailed information on what you can pass via the `options` object.
         * @method create
         * @param {object} [options]
         * @return {engine} engine
         */
        Engine.create = function(element, options) {
            // options may be passed as the first (and only) argument
            options = Common.isElement(element) ? options : element;
            element = Common.isElement(element) ? element : null;
            options = options || {};
    
            if (element || options.render) {
                Common.warn('Engine.create: engine.render is deprecated (see docs)');
            }
    
            var defaults = {
                positionIterations: 6,
                velocityIterations: 4,
                constraintIterations: 2,
                enableSleeping: false,
                events: [],
                plugin: {},
                timing: {
                    timestamp: 0,
                    timeScale: 1
                },
                broadphase: {
                    controller: Grid
                }
            };
    
            var engine = Common.extend(defaults, options);
    
            // @deprecated
            if (element || engine.render) {
                var renderDefaults = {
                    element: element,
                    controller: Render
                };
                
                engine.render = Common.extend(renderDefaults, engine.render);
            }
    
            // @deprecated
            if (engine.render && engine.render.controller) {
                engine.render = engine.render.controller.create(engine.render);
            }
    
            // @deprecated
            if (engine.render) {
                engine.render.engine = engine;
            }
    
            engine.world = options.world || World.create(engine.world);
            engine.pairs = Pairs.create();
            engine.broadphase = engine.broadphase.controller.create(engine.broadphase);
            engine.metrics = engine.metrics || { extended: false };
    
    
            return engine;
        };
    
        /**
         * Moves the simulation forward in time by `delta` ms.
         * The `correction` argument is an optional `Number` that specifies the time correction factor to apply to the update.
         * This can help improve the accuracy of the simulation in cases where `delta` is changing between updates.
         * The value of `correction` is defined as `delta / lastDelta`, i.e. the percentage change of `delta` over the last step.
         * Therefore the value is always `1` (no correction) when `delta` constant (or when no correction is desired, which is the default).
         * See the paper on <a href="http://lonesock.net/article/verlet.html">Time Corrected Verlet</a> for more information.
         *
         * Triggers `beforeUpdate` and `afterUpdate` events.
         * Triggers `collisionStart`, `collisionActive` and `collisionEnd` events.
         * @method update
         * @param {engine} engine
         * @param {number} [delta=16.666]
         * @param {number} [correction=1]
         */
        Engine.update = function(engine, delta, correction) {
            delta = delta || 1000 / 60;
            correction = correction || 1;
    
            var world = engine.world,
                timing = engine.timing,
                broadphase = engine.broadphase,
                broadphasePairs = [],
                i;
    
            // increment timestamp
            timing.timestamp += delta * timing.timeScale;
    
            // create an event object
            var event = {
                timestamp: timing.timestamp
            };
    
            Events.trigger(engine, 'beforeUpdate', event);
    
            // get lists of all bodies and constraints, no matter what composites they are in
            var allBodies = Composite.allBodies(world),
                allConstraints = Composite.allConstraints(world);
    
    
            // if sleeping enabled, call the sleeping controller
            if (engine.enableSleeping)
                Sleeping.update(allBodies, timing.timeScale);
    
            // applies gravity to all bodies
            _bodiesApplyGravity(allBodies, world.gravity);
    
            // update all body position and rotation by integration
            _bodiesUpdate(allBodies, delta, timing.timeScale, correction, world.bounds);
    
            // update all constraints
            for (i = 0; i < engine.constraintIterations; i++) {
                Constraint.solveAll(allConstraints, timing.timeScale);
            }
            Constraint.postSolveAll(allBodies);
    
            // broadphase pass: find potential collision pairs
            if (broadphase.controller) {
    
                // if world is dirty, we must flush the whole grid
                if (world.isModified)
                    broadphase.controller.clear(broadphase);
    
                // update the grid buckets based on current bodies
                broadphase.controller.update(broadphase, allBodies, engine, world.isModified);
                broadphasePairs = broadphase.pairsList;
            } else {
    
                // if no broadphase set, we just pass all bodies
                broadphasePairs = allBodies;
            }
    
            // clear all composite modified flags
            if (world.isModified) {
                Composite.setModified(world, false, false, true);
            }
    
            // narrowphase pass: find actual collisions, then create or update collision pairs
            var collisions = broadphase.detector(broadphasePairs, engine);
    
            // update collision pairs
            var pairs = engine.pairs,
                timestamp = timing.timestamp;
            Pairs.update(pairs, collisions, timestamp);
            Pairs.removeOld(pairs, timestamp);
    
            // wake up bodies involved in collisions
            if (engine.enableSleeping)
                Sleeping.afterCollisions(pairs.list, timing.timeScale);
    
            // trigger collision events
            if (pairs.collisionStart.length > 0)
                Events.trigger(engine, 'collisionStart', { pairs: pairs.collisionStart });
    
            // iteratively resolve position between collisions
            Resolver.preSolvePosition(pairs.list);
            for (i = 0; i < engine.positionIterations; i++) {
                Resolver.solvePosition(pairs.list, timing.timeScale);
            }
            Resolver.postSolvePosition(allBodies);
    
            // iteratively resolve velocity between collisions
            Resolver.preSolveVelocity(pairs.list);
            for (i = 0; i < engine.velocityIterations; i++) {
                Resolver.solveVelocity(pairs.list, timing.timeScale);
            }
    
            // trigger collision events
            if (pairs.collisionActive.length > 0)
                Events.trigger(engine, 'collisionActive', { pairs: pairs.collisionActive });
    
            if (pairs.collisionEnd.length > 0)
                Events.trigger(engine, 'collisionEnd', { pairs: pairs.collisionEnd });
    
    
            // clear force buffers
            _bodiesClearForces(allBodies);
    
            Events.trigger(engine, 'afterUpdate', event);
    
            return engine;
        };
        
        /**
         * Merges two engines by keeping the configuration of `engineA` but replacing the world with the one from `engineB`.
         * @method merge
         * @param {engine} engineA
         * @param {engine} engineB
         */
        Engine.merge = function(engineA, engineB) {
            Common.extend(engineA, engineB);
            
            if (engineB.world) {
                engineA.world = engineB.world;
    
                Engine.clear(engineA);
    
                var bodies = Composite.allBodies(engineA.world);
    
                for (var i = 0; i < bodies.length; i++) {
                    var body = bodies[i];
                    Sleeping.set(body, false);
                    body.id = Common.nextId();
                }
            }
        };
    
        /**
         * Clears the engine including the world, pairs and broadphase.
         * @method clear
         * @param {engine} engine
         */
        Engine.clear = function(engine) {
            var world = engine.world;
            
            Pairs.clear(engine.pairs);
    
            var broadphase = engine.broadphase;
            if (broadphase.controller) {
                var bodies = Composite.allBodies(world);
                broadphase.controller.clear(broadphase);
                broadphase.controller.update(broadphase, bodies, engine, true);
            }
        };
    
        /**
         * Zeroes the `body.force` and `body.torque` force buffers.
         * @method bodiesClearForces
         * @private
         * @param {body[]} bodies
         */
        var _bodiesClearForces = function(bodies) {
            for (var i = 0; i < bodies.length; i++) {
                var body = bodies[i];
    
                // reset force buffers
                body.force.x = 0;
                body.force.y = 0;
                body.torque = 0;
            }
        };
    
        /**
         * Applys a mass dependant force to all given bodies.
         * @method bodiesApplyGravity
         * @private
         * @param {body[]} bodies
         * @param {vector} gravity
         */
        var _bodiesApplyGravity = function(bodies, gravity) {
            var gravityScale = typeof gravity.scale !== 'undefined' ? gravity.scale : 0.001;
    
            if ((gravity.x === 0 && gravity.y === 0) || gravityScale === 0) {
                return;
            }
            
            for (var i = 0; i < bodies.length; i++) {
                var body = bodies[i];
    
                if (body.isStatic || body.isSleeping)
                    continue;
    
                // apply gravity
                body.force.y += body.mass * gravity.y * gravityScale;
                body.force.x += body.mass * gravity.x * gravityScale;
            