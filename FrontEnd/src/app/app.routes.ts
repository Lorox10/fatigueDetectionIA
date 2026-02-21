import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ConductoresComponent } from './pages/conductores/conductores.component';
import { MainLayoutComponent } from './shared/layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'conductores', component: ConductoresComponent }
    ]
  }
];
