import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { HomeComponent } from './app/home.component';
import { AddContactComponent } from './app/add-contact.component';
import { ViewContactsComponent } from './app/view-contacts.component';
bootstrapApplication(AppComponent, { providers: [provideHttpClient(), provideRouter([
  { path: '', component: HomeComponent, title: 'Home | Contact Manager' },
  { path: 'add', component: AddContactComponent, title: 'Add Contact | Contact Manager' },
  { path: 'contacts', component: ViewContactsComponent, title: 'View Contacts | Contact Manager' },
  { path: '**', redirectTo: '' }
])] }).catch(error => console.error(error));
