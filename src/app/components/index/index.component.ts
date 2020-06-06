import {Component, OnInit, AfterViewInit, ViewChild, ElementRef} from "@angular/core";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {environment} from "@src/environments/environment";
import {session, timeout} from "@src/app/app.common";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {getCurrCads} from "@src/app/store/selectors";
import {ToolbarComponent} from "../menu/toolbar/toolbar.component";
import {SubCadsComponent} from "../menu/sub-cads/sub-cads.component";
import {Vector2} from "three";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {CadInfoComponent} from "../menu/cad-info/cad-info.component";

@Component({
	selector: "app-index",
	templateUrl: "./index.component.html",
	styleUrls: ["./index.component.scss"]
})
export class IndexComponent implements OnInit, AfterViewInit {
	cad: CadViewer;
	collection = "";
	currCads: CadData[];
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	@ViewChild(ToolbarComponent) toolbar: ToolbarComponent;
	@ViewChild(SubCadsComponent) subCads: SubCadsComponent;
	@ViewChild(CadInfoComponent) cadInfo: CadInfoComponent;

	constructor(private store: Store<State>) {}

	ngOnInit() {
		this.cad = new CadViewer(new CadData(session.load("cadData", true) || {}), {
			width: innerWidth,
			height: innerHeight,
			showStats: !environment.production,
			padding: [50, 300, 30, 250],
			showLineLength: 8
		});
		this.cad.setControls({selectMode: "multiple"});
		if (this.cad.stats) {
			this.cad.stats.dom.style.right = "0";
			this.cad.stats.dom.style.left = "";
		}
		// console.log(this.store.);
		this.store.select(getCurrCads).subscribe((cads) => {
			this.currCads = this.cad.data.findChildren(Array.from(cads));
			if (this.currCads.length) {
				this.cad.traverse((o, e) => {
					o.userData.selectable = false;
					e.opacity = 0.3;
				});
				this.currCads.forEach((v) => {
					this.cad.traverse((o, e) => {
						o.userData.selectable = true;
						e.opacity = 1;
					}, v.getAllEntities());
				});
				this.cad.controls.config.dragAxis = "";
			} else {
				this.cad.traverse((o, e) => {
					o.userData.selectable = true;
					e.opacity = 1;
				});
				this.cad.controls.config.dragAxis = "xy";
			}
			this.cad.render();
		});

		const lastPointer = new Vector2();
		this.cad.controls.on("dragstart", ({clientX, clientY}) => lastPointer.set(clientX, clientY));
		this.cad.controls.on("drag", ({clientX, clientY}) => {
			const {cad, currCads} = this;
			const pointer = new Vector2(clientX, clientY);
			const translate = lastPointer.sub(pointer).divideScalar(cad.scale);
			translate.x = -translate.x;
			currCads.forEach((v) => v.transform(new CadTransformation({translate})));
			cad.render();
			lastPointer.copy(pointer);
		});

		Object.assign(window, {view: this});
		window.addEventListener("resize", () => this.cad.resize(innerWidth, innerHeight));
	}

	ngAfterViewInit() {
		this.cadContainer.nativeElement.appendChild(this.cad.dom);
		(async () => {
			await timeout(0);
			this.subCads.update(this.cad.data.components.data);
		})();
	}

	afterOpenCad(data: CadData[]) {
		this.subCads.update(data);
		session.save("cadData", this.cad.data.export());
	}

	// bindKeys() {
	// 	window.addEventListener("keydown", ({key, ctrlKey}) => {
	// 		if (ctrlKey) {
	// 			switch (key) {
	// 				case "s":
	// 					this.save();
	// 					break;
	// 			}
	// 		}
	// 	});
	// }
}
