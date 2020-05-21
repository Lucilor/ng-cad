import {Component, ViewChild, ElementRef, AfterViewInit} from "@angular/core";

@Component({
	selector: "app-playground",
	templateUrl: "./playground.component.html",
	styleUrls: ["./playground.component.scss"]
})
export class PlaygroundComponent implements AfterViewInit {
	@ViewChild("container", {read: ElementRef}) container: ElementRef<HTMLElement>;
	constructor() {}

	ngAfterViewInit() {}
}
