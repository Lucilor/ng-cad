import {Component, OnInit, AfterViewInit, ViewChild, ElementRef} from "@angular/core";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {environment} from "@src/environments/environment";
import {TopMenuComponent} from "../menu/top-menu/top-menu.component";
import {LeftMenuComponent} from "../menu/left-menu/left-menu.component";
import {session, timeout} from "@src/app/app.common";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {getCurrCads} from "@src/app/store/selectors";

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
	@ViewChild("topMenu", {read: TopMenuComponent}) topMenu: TopMenuComponent;
	@ViewChild("leftMenu", {read: LeftMenuComponent}) leftMenu: LeftMenuComponent;

	constructor(private store: Store<State>) {}

	ngOnInit() {
		this.cad = new CadViewer(new CadData(session.load("cadData", true) || {}), {
			width: innerWidth,
			height: innerHeight,
			showStats: !environment.production,
			padding: [50, 30, 30, 30],
			showLineLength: 8
		});
		this.cad.setControls({selectMode: "multiple"});
		if (this.cad.stats) {
			this.cad.stats.dom.style.right = "0";
			this.cad.stats.dom.style.left = "";
		}
		this.store.select(getCurrCads).subscribe((cads) => {
			this.currCads = this.cad.data.components.data.filter((v) => cads.has(v.id));
			console.log(cads);
		});
		Object.assign(window, {view: this});
	}

	ngAfterViewInit() {
		this.cadContainer.nativeElement.appendChild(this.cad.dom);
		(async () => {
			await timeout(0);
			this.leftMenu.update(this.cad.data.components.data);
		})();
	}

	afterOpenCad(data: CadData[]) {
		this.leftMenu.update(data);
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
