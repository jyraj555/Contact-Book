import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ContactsService, ContactInput } from './contacts.service';
const emptyContact = (): ContactInput => ({ firstName: '', lastName: '', company: '', mobile1: '', mobile2: '', email: '' });
@Component({ selector: 'app-add-contact', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './add-contact.component.html' })
export class AddContactComponent {
  contact = emptyContact();
  saving = false;
  saveError = '';
  success = '';
  constructor(private service: ContactsService) {}
  clearFeedback() { this.success = ''; this.saveError = ''; }
  save(form: NgForm) {
    if (this.saving) return;
    this.clearFeedback();
    if (form.invalid || !this.contact.firstName.trim() || !this.contact.mobile1.trim()) {
      this.saveError = 'Enter a first name and mobile number 1, and check the other fields.'; return;
    }
    this.saving = true;
    this.service.saveContact(this.contact).subscribe({
      next: () => {
        this.contact = emptyContact(); form.resetForm(this.contact);
        this.success = 'Contact saved successfully.'; this.saving = false;
      },
      error: error => {
        this.saveError = error.status === 400 ? error.error.message : 'Could not save contact. Please try again.';
        this.saving = false;
      }
    });
  }
}
