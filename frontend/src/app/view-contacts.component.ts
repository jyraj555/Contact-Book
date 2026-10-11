import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ContactsService, Contact } from './contacts.service';
@Component({ standalone: true, imports: [CommonModule, FormsModule, RouterLink], templateUrl: './view-contacts.component.html' })
export class ViewContactsComponent implements OnInit {
  contacts: Contact[] = []; query = ''; loading = true; error = ''; message = ''; busy = false;
  editing: Contact | null = null; deleting: Contact | null = null;
  constructor(private service: ContactsService) {}
  ngOnInit() { this.load(); }
  load() { this.loading = true; this.error = ''; this.service.getContacts().subscribe({
    next: rows => { this.contacts = rows; this.loading = false; },
    error: () => { this.error = 'Could not load contacts. Please retry.'; this.loading = false; }
  }); }
  get filtered() { const q = this.query.trim().toLowerCase(); return this.contacts.filter(c => [c.firstName + ' ' + c.lastName, c.company, c.mobile1, c.mobile2, c.email].some(v => v.toLowerCase().includes(q))); }
  initials(c: Contact) { return (c.firstName.charAt(0) + c.lastName.charAt(0)).toUpperCase(); }
  edit(c: Contact) { this.editing = { ...c }; this.deleting = null; this.error = ''; this.message = ''; }
  askDelete(c: Contact) { this.deleting = c; this.editing = null; this.error = ''; this.message = ''; }
  cancel() { this.editing = null; this.deleting = null; this.error = ''; }
  update(form: NgForm) {
    if (this.busy || !this.editing || form.invalid) return;
    this.busy = true; this.error = '';
    this.service.updateContact(this.editing._id, this.editing).subscribe({
      next: saved => { this.contacts = this.contacts.map(c => c._id === saved._id ? saved : c); this.editing = null; this.busy = false; this.message = 'Contact updated.'; },
      error: e => { this.error = e.error?.message || 'Could not update contact.'; this.busy = false; }
    });
  }
  remove() {
    if (this.busy || !this.deleting) return;
    const id = this.deleting._id; this.busy = true; this.error = '';
    this.service.deleteContact(id).subscribe({
      next: () => { this.contacts = this.contacts.filter(c => c._id !== id); this.deleting = null; this.busy = false; this.message = 'Contact deleted.'; },
      error: e => { this.error = e.error?.message || 'Could not delete contact.'; this.busy = false; }
    });
  }
  track(_index: number, c: Contact) { return c._id; }
}
