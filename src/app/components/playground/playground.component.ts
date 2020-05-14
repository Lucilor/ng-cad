import {Component, ViewChild, ElementRef, AfterViewInit} from "@angular/core";
import {BezierCurve} from "@src/app/bezier-drawer/bezier-curve";
import {Point} from "@lucilor/utils";
import {
	Scene,
	PerspectiveCamera,
	WebGLRenderer,
	BufferGeometry,
	Vector3,
	LineBasicMaterial,
	Line,
	MeshPhongMaterial,
	Mesh,
	PointLight,
	AmbientLight,
	BoxGeometry,
	DirectionalLight
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";

@Component({
	selector: "app-playground",
	templateUrl: "./playground.component.html",
	styleUrls: ["./playground.component.scss"]
})
export class PlaygroundComponent implements AfterViewInit {
	@ViewChild("container", {read: ElementRef}) container: ElementRef<HTMLElement>;
	constructor() {}

	ngAfterViewInit() {
		const scene = new Scene();
		const camera = new PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
		const renderer = new WebGLRenderer();
		renderer.setSize(innerWidth, innerHeight);

		scene.add(new AmbientLight(0xcccccc));
		scene.add(new DirectionalLight(0xffffff));
		// const pointLight = new PointLight(0xffffff);
		// pointLight.position.set(0, 0, 100);
		// scene.add(pointLight);

		const orbit = new OrbitControls(camera, renderer.domElement);
		const stats = Stats();

		const animate = () => {
			requestAnimationFrame(animate);
			renderer.render(scene, camera);
			orbit.update();
			stats.update();
		};
		animate();

		this.container.nativeElement.appendChild(renderer.domElement);
		this.container.nativeElement.appendChild(orbit.domElement);
		this.container.nativeElement.appendChild(stats.dom);

		scene.add(new Mesh(new BoxGeometry(10, 10, 10), new MeshPhongMaterial({color: 0xffffff})));

		const ctrlPoints = [new Point(10, 10), new Point(20, 20), new Point(30, 10)];
		const curve = new BezierCurve(ctrlPoints);
		const points = curve.getPoints(50).map((p) => new Vector3(p.x, p.y, 0));
		console.log(points);
		const geometry = new BufferGeometry().setFromPoints(points);
		const material = new LineBasicMaterial({color: 0xffffff});
		const line = new Line(geometry, material);
		scene.add(line);
		console.log(line);
		camera.position.set(0, 0, 50);
		camera.lookAt(0, 0, 0);
	}

	addPoint() {}
}
