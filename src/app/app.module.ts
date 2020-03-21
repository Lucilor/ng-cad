import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";

import {AppRoutingModule} from "./app-routing.module";
import {AppComponent} from "./app.component";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {DrawCadComponent} from "./draw-cad/draw-cad.component";
import {LoadingComponent} from "./loading/loading.component";
import {StoreModule} from "@ngrx/store";
import {HttpClientModule} from "@angular/common/http";
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { IndexComponent } from './index/index.component';

@NgModule({
	declarations: [AppComponent, DrawCadComponent, LoadingComponent, PageNotFoundComponent, IndexComponent],
	imports: [BrowserModule, AppRoutingModule, BrowserAnimationsModule, StoreModule.forRoot({}, {}), HttpClientModule],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule {}
