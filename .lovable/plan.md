

# Make You Cipher + Cipher Management

## What needs to happen

### 1. Update your role to Cipher
Your account (`warplanetonlinelvl9@gmail.com`, user ID `77407b8b-...`) currently has the `admin` role in `user_roles`. This will be changed to `cipher`.

### 2. Cipher can already manage other ciphers
The existing RLS policies on `user_roles` already support this:
- **INSERT**: Cipher can insert any role (including cipher)
- **DELETE**: Cipher can delete any user's role (including other ciphers)
- **UPDATE**: Cipher can update any user's role

No RLS changes needed.

### 3. UI confirmation
The `CompanyContext` already checks `user_roles` for cipher status, so once the role is updated, you'll have full platform-level access.

## Technical Details

A single SQL statement will run:
```sql
UPDATE public.user_roles 
SET role = 'cipher' 
WHERE user_id = '77407b8b-2023-4588-9857-1b10dce499cc';
```

No code changes are needed -- the existing permission system and RLS policies fully support cipher-to-cipher management.
