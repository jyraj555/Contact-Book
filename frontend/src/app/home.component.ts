import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ContactsService } from './contacts.service';
@Component({ standalone: true, imports: [CommonModule, RouterLink], template: `
<h1>Your contacts, organised.</h1><p class="subtitle">A simple place to manage the people you know.</p>
<div class="home-grid"><a class="feature" routerLink="/add"><span class="icon">+</span><h2>Add Contact &rarr;</h2><p>Create a new contact with personal and company details.</p></a>
<a class="feature" routerLink="/contacts"><span class="icon">?</span><h2>View Contacts &rarr;</h2><p>Search, edit and manage your saved contacts.</p></a></div>
<p class="hint" *ngIf="count !== null">{{ count }} {{ count === 1 ? 'contact' : 'contacts' }} in your phonebook</p>
<p class="error" *ngIf="error" role="alert">{{ error }} <button (click)="load()">Retry</button></p>` })
export class HomeComponent implements OnInit {
  count: number | null = null; error = '';
  constructor(private service: ContactsService) {}
  ngOnInit() { this.load(); }
  load() { this.error = ''; this.service.getContacts().subscribe({ next: rows => this.count = rows.length, error: () => this.error = 'Could not load contact count.' }); }
}
