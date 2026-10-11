import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
export interface ContactInput { firstName: string; lastName: string; company: string; mobile1: string; mobile2: string; email: string; }
export interface Contact extends ContactInput { _id: string; createdAt: string; }
@Injectable({ providedIn: 'root' })
export class ContactsService {
  constructor(private http: HttpClient) {}
  updateContact(id: string, contact: ContactInput) { return this.http.put<Contact>('/api/contacts/' + id, contact); }
  deleteContact(id: string) { return this.http.delete<{message: string}>('/api/contacts/' + id); }
  getContacts() { return this.http.get<Contact[]>('/api/contacts'); }
  saveContact(contact: ContactInput) { return this.http.post<Contact>('/api/contacts', contact); }
}
