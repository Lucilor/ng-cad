import {Component, OnInit, Input} from "@angular/core";
import {CadMenu} from "../cad-menu.common";
import {CadInfoComponent} from "../cad-info/cad-info.component";
import {CadLineComponent} from "../cad-line/cad-line.component";

@Component({
	selector: "app-line-indicator",
	templateUrl: "./line-indicator.component.html",
	styleUrls: ["./line-indicator.component.scss"]
})
export class LineIndicatorComponent implements OnInit {
	@Input() menu: CadMenu;
	@Input() cadInfo: CadInfoComponent;
	@Input() cadLine: CadLineComponent;
	constructor() {}

	ngOnInit(): void {}
}
