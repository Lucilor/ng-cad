import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";

import {AppRoutingModule} from "./app-routing.module";
import {AppComponent} from "./app.component";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {DrawCadComponent} from "./draw-cad/draw-cad.component";
import {LoadingComponent} from "./loading/loading.component";
import {StoreModule} from "@ngrx/store";
import {reducers, metaReducers} from "./store/reducers";
import {HttpClientModule} from "@angular/common/http";
import {PageNotFoundComponent} from "./page-not-found/page-not-found.component";
import {IndexComponent} from "./index/index.component";
import {AlertComponent} from "./alert/alert.component";
import {MatDialogModule} from "@angular/material/dialog";
import {MatButtonModule} from "@angular/material/button";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatInputModule} from "@angular/material/input";
import {MatExpansionModule} from "@angular/material/expansion";
import {EditCadComponent} from "./edit-cad/edit-cad.component";

@NgModule({
	declarations: [
		AppComponent,
		DrawCadComponent,
		LoadingComponent,
		PageNotFoundComponent,
		IndexComponent,
		AlertComponent,
		EditCadComponent
	],
	imports: [
		BrowserModule,
		AppRoutingModule,
		BrowserAnimationsModule,
		StoreModule.forRoot(reducers, {
			metaReducers,
			runtimeChecks: {
				strictStateImmutability: true,
				strictActionImmutability: true
			}
		}),
		HttpClientModule,
		MatDialogModule,
		MatButtonModule,
		MatProgressSpinnerModule,
		MatInputModule,
		MatExpansionModule
	],
	providers: [AlertComponent],
	bootstrap: [AppComponent]
})
export class AppModule {}
