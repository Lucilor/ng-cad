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
	Raycaster
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
	needsUpdate = false;
	private _destroyed = false;
	private _currentTime = 0;
	private _geometries = {point: new ShapeGeometry(new Shape(new ArcCurve(0, 0, 0.5, 0, Math.PI * 2, true).getPoints(64)))};
	private _materials = {point: new MeshBasicMaterial()};
	private _raycaster = new Raycaster();

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

		const ctrl = new LineSegments(new BufferGeometry(), new LineBasicMaterial());
		const curve = new Line(new BufferGeometry(), new LineBasicMaterial({color: 0xff0000}));
		this.objects = {ctrl, curve};
		scene.add(ctrl, curve);

		camera.position.set(0, 0, 50);
		camera.lookAt(0, 0, 0);

		this.render();
	}

	render() {
		if (this.needsUpdate) {
			const {config, curve, _currentTime, objects, _geometries, _materials} = this;
			const {duration} = config;
			const groups = curve.deCasteljau(_currentTime / duration);
			const ctrlGeometry = objects.ctrl.geometry as BufferGeometry;
			const curveGeometry = objects.curve.geometry as BufferGeometry;
			const ctrlPosition = [];
			const curvePosition = Array.from(curveGeometry.getAttribute("position")?.array || []);
			if (_currentTime <= 0) {
				curvePosition.length = 0;
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
			ctrlGeometry.setAttribute("position", new Float32BufferAttribute(ctrlPosition, 3));
			curveGeometry.setAttribute("position", new Float32BufferAttribute(curvePosition, 3));
			this._currentTime += (1 / duration) * 60000;
			if (this._currentTime > duration) {
				this._currentTime = 0;
				this.needsUpdate = false;
			}
		}
	}

	getNDC(point: Vector2) {
		const rect = this.dom.getBoundingClientRect();
		return new Vector3(((point.x - rect.left) / rect.width) * 2 - 1, ((rect.top - point.y) / rect.height) * 2 + 1, -1);
	}

	getNDCReverse(point: Vector3) {
		const rect = this.dom.getBoundingClientRect();
		const a = rect.width / 2;
		const b = rect.height / 2;
		return new Vector2(point.x * a + a + rect.left, -point.y * b + b + rect.top);
	}

	getWorldPoint(point: Vector2) {
		return this.getNDC(point).unproject(this.camera);
	}

	getScreenPoint(point: Vector3) {
		return this.getNDCReverse(point.project(this.camera));
	}

	addCtrlPoint(point: Vector2) {
		const {_raycaster, camera} = this;
		_raycaster.setFromCamera(this.getNDC(point), camera);
		console.log(this.getNDC(point));
	}
}
