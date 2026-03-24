# QA Checklist

Use this checklist for manual MVP validation before internal production use.

## Preconditions

- Backend running on `http://localhost:3001`
- Frontend running on `http://localhost:3000`
- PostgreSQL running and schema applied
- Seeded users/categories:
  - `npm run seed:users`
  - `npm run seed:categories`
- Smartsheet env vars configured (for sync tests)

## 1) Sync preview

- [ ] Run `npm run sync:preview`
- [ ] Confirm sheet columns print correctly
- [ ] Confirm sample rows print correctly
- [ ] Confirm mapped preview rows print correctly
- [ ] Confirm no DB writes occur in preview mode

## 2) Sync run

- [ ] Run `npm run sync:run`
- [ ] Confirm processed/inserted/updated counts are logged
- [ ] Confirm tickets are present in local DB/list page
- [ ] Confirm no Smartsheet writeback calls are made

## 3) Ticket list loading

- [ ] Open `/` and confirm ticket list loads
- [ ] Confirm loading state appears before data
- [ ] Confirm empty state appears when no matching tickets
- [ ] Confirm retry action works when backend is temporarily unavailable

## 4) Filtering

- [ ] Filter by `approval_status`
- [ ] Filter by `queue`
- [ ] Filter by `ticket_status`
- [ ] Filter by `category`
- [ ] Validate pagination updates correctly with filters

## 5) Detail page

- [ ] Click a ticket row and open `/tickets/:id`
- [ ] Confirm ticket fields render correctly
- [ ] Confirm current assignee/category/status values are preselected

## 6) Status save

- [ ] Change `ticket_status`
- [ ] Click `Save`
- [ ] Confirm success message
- [ ] Refresh page and verify persisted value

## 7) Assignee save

- [ ] Change assignee
- [ ] Click `Save`
- [ ] Refresh page and verify persisted assignee
- [ ] Confirm assignee name appears in list page

## 8) Category save

- [ ] Change category on detail page
- [ ] Click `Save`
- [ ] Refresh page and verify persisted category
- [ ] Confirm category name appears in list page

## 9) Internal notes

- [ ] Add internal note
- [ ] Confirm note appears in activity thread
- [ ] Refresh page and verify note persists
- [ ] Confirm note is labeled `Internal note`

## 10) Public reply (log-only)

- [ ] Ensure `EMAIL_LOG_ONLY=true`
- [ ] Send reply from detail page
- [ ] Confirm success message indicates log-only mode
- [ ] Confirm reply appears in activity thread
- [ ] Confirm reply label is `Sent to requester`
- [ ] Confirm `To:` email is shown on public reply

## 11) Approval status update

- [ ] Use `Approve` button
- [ ] Confirm approval status badge updates
- [ ] Use `Deny` button
- [ ] Confirm denied status updates and stays visible
- [ ] Confirm list page approval badge colors:
  - pending: yellow
  - approved: green
  - denied: red
