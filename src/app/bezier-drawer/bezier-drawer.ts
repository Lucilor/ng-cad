import {
	Scene,
	PerspectiveCamera,
	WebGLRenderer,
	BufferGeometry,
	LineBasicMaterial,
	Float32BufferAttribute,
	Vector2,
	Vector3,
	LineSegments,
	PointLight,
	AmbientLight,
	Line,
	ShapeGeometry,
	ArcCurve,
	Shape,
	Mesh,
	MeshBasicMaterial,
	Raycaster,
	Plane,
	Clock
} from "three";
import {BezierCurve} from "./bezier-curve";
import Stats from "three/examples/jsm/libs/stats.module";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

export interface BezierDrawerConfig {
	width?: number;
	height?: number;
	backgroundColor?: number;
	backgroundAlpha?: number;
	showStats?: boolean;
	duration?: number;
	segments?: number;
}

export class BezierDrawer {
	dom: HTMLDivElement;
	scene: Scene;
	camera: PerspectiveCamera;
	renderer: WebGLRenderer;
	curve = new BezierCurve();
	objects: {ctrl: LineSegments; curve: Line};
	config: BezierDrawerConfig = {
		width: 300,
		height: 150,
		backgroundColor: 0,
		backgroundAlpha: 1,
		showStats: true,
		duration: 3000,
		segments: 512
	};
	stats: Stats;
	controls: OrbitControls;
	private _needsUpdate = false;
	private _paused = false;
	private _stoped = false;
	private _loop = false;
	private _destroyed = false;
	private _currentTime = 0;
	private _geometries = {point: new ShapeGeometry(new Shape(new ArcCurve(0, 0, 0.5, 0, Math.PI * 2, true).getPoints(64)))};
	private _materials = {point: new MeshBasicMaterial()};
	private _raycaster = new Raycaster();
	private _clock = new Clock();

	constructor(config: BezierDrawerConfig = {}) {
		this.config = {...this.config, ...config};
		const {width, height, backgroundColor, backgroundAlpha} = this.config;
		const scene = new Scene();
		const camera = new PerspectiveCamera(60, width / height, 0.1, 15000);
		const renderer = new WebGLRenderer({preserveDrawingBuffer: true});
		renderer.setClearColor(backgroundColor, backgroundAlpha);
		renderer.setSize(width, height);

		const dom = document.createElement("div");
		dom.appendChild(renderer.domElement);
		dom.classList.add("bezier-drawer");
		this.dom = dom;
		this.scene = scene;
		this.camera = camera;
		this.renderer = renderer;

		scene.add(camera);
		const light = new PointLight(0xffffff, 0.5);
		light.position.set(0, 0, 0);
		camera.add(light);
		scene.add(new AmbientLight(0xffffff, 0.4));

		if (this.config.showStats) {
			this.stats = Stats();
			dom.appendChild(this.stats.dom);
		}
		this.controls = new OrbitControls(camera, dom);

		const ctrl = new LineSegments(new BufferGeometry(), new LineBasicMaterial());
		const curve = new Line(new BufferGeometry(), new LineBasicMaterial({color: 0xff0000}));
		this.objects = {ctrl, curve};
		scene.add(ctrl, curve);

		camera.position.set(0, 0, 50);
		camera.lookAt(0, 0, 0);

		const animate = () => {
			if (!this._destroyed) {
				requestAnimationFrame(animate.bind(this));
				const {renderer, camera, scene} = this;
				renderer?.render(scene, camera);
				this.stats?.update();
				this.controls?.update();
				this.render();
			}
		};
		animate();
	}

	render() {
		const {config, curve, _currentTime, objects, _geometries, _materials, _clock} = this;
		const {_needsUpdate, _stoped, _loop, _paused} = this;
		const ctrlGeometry = objects.ctrl.geometry as BufferGeometry;
		const curveGeometry = objects.curve.geometry as BufferGeometry;
		if (_stoped) {
			ctrlGeometry.setAttribute("position", new Float32BufferAttribute([], 3));
			curveGeometry.setAttribute("position", new Float32BufferAttribute([], 3));
			objects.ctrl.remove(...objects.ctrl.children);
		} else if (_paused) {
			return;
		} else if (_needsUpdate || _loop) {
			const {duration} = config;
			const groups = curve.deCasteljau(_currentTime / duration);
			const ctrlPosition = [];
			const curvePosition = Array.from(curveGeometry.getAttribute("position")?.array || []);
			if (_currentTime <= 0) {
				curvePosition.length = 0;
				_clock.start();
			}
			let childIndex = 0;
			groups.forEach((group) => {
				group.forEach((point, i) => {
					if (i < group.length - 1) {
						ctrlPosition.push(point.x, point.y, 0);
						ctrlPosition.push(group[i + 1].x, group[i + 1].y, 0);
					}
					if (!objects.ctrl.children[childIndex]) {
						const mesh = new Mesh(_geometries.point, _materials.point);
						objects.ctrl.children[childIndex] = mesh;
					}
					objects.ctrl.children[childIndex].position.set(point.x, point.y, 0);
					childIndex++;
				});
				if (group.length === 1) {
					curvePosition.push(group[0].x, group[0].y, 0);
				}
			});
			const toRemoved = objects.ctrl.children.slice(childIndex, objects.ctrl.children.length);
			objects.ctrl.remove(...toRemoved);
			ctrlGeometry.setAttribute("position", new Float32BufferAttribute(ctrlPosition, 3));
			curveGeometry.setAttribute("position", new Float32BufferAttribute(curvePosition, 3));
			if (this._currentTime === duration) {
				this._currentTime = 0;
				this._needsUpdate = _loop;
			} else {
				this._currentTime = _clock.getElapsedTime() * 1000;
			}
			if (this._currentTime > duration) {
				this._currentTime = duration;
				_clock.stop();
			}
		}
	}

	private _getNDC(point: Vector2) {
		const rect = this.dom.getBoundingClientRect();
		return new Vector3(((point.x - rect.left) / rect.width) * 2 - 1, ((rect.top - point.y) / rect.height) * 2 + 1, 0.5);
	}

	private _getNDCReverse(point: Vector3) {
		const rect = this.dom.getBoundingClientRect();
		const a = rect.width / 2;
		const b = rect.height / 2;
		return new Vector2(point.x * a + a + rect.left, -point.y * b + b + rect.top);
	}

	private _getWorldPoint(point: Vector2) {
		return this._getNDC(point).unproject(this.camera);
	}

	private _getScreenPoint(point: Vector3) {
		return this._getNDCReverse(point.project(this.camera));
	}

	start() {
		this._stoped = false;
		this._currentTime = 0;
		this._needsUpdate = true;
		return this.resume();
	}

	end() {
		this._stoped = true;
		this._currentTime = 0;
		this._needsUpdate = false;
		return this.pause();
	}

	pause() {
		this._paused = true;
		return this;
	}

	resume() {
		this._paused = false;
		return this;
	}

	loop() {
		this._loop = true;
		return this;
	}

	unloop() {
		this._loop = false;
		return this;
	}

	addCtrlPoint(point: Vector2) {
		const {_raycaster, camera} = this;
		_raycaster.setFromCamera(this._getNDC(point), camera);
		const plane = new Plane(new Vector3(0, 0, 1));
		const p = new Vector3();
		_raycaster.ray.intersectPlane(plane, p);
		this.curve.ctrlPoints.push(new Vector2(p.x, p.y));
		return this.start();
	}

	removeCtrlPoint(index: number) {
		this.curve.ctrlPoints.splice(index, 1);
		return this.start();
	}
}
