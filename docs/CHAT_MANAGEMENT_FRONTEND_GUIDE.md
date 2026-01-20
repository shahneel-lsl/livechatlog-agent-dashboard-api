# Chat Management API - Frontend Developer Guide

## Overview

This document provides comprehensive guidance for frontend developers implementing chat management features in the LiveChatLog Dashboard. The API follows LiveChat Inc's threading model for conversation management.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Conversation List API](#conversation-list-api)
3. [Close Conversation](#close-conversation)
4. [Reopen Conversation](#reopen-conversation)
5. [Tag Management](#tag-management)
6. [Bulk Operations](#bulk-operations)
7. [Firebase Real-time Updates](#firebase-real-time-updates)
8. [Error Handling](#error-handling)
9. [Implementation Examples](#implementation-examples)

---

## Architecture Overview

### Threading Model (LiveChat Inc Style)

The system uses a hierarchical model:

```
Conversation (ongoing relationship with visitor)
  └── Thread 1 (closed session)
  │     └── Event 1 (message)
  │     └── Event 2 (system event)
  │
  └── Thread 2 (closed session)
  │     └── Event 3 (message)
  │
  └── Thread 3 (ACTIVE session)
        └── Event 4 (message)
```

**Key Concepts:**

1. **Conversation**: Represents the entire history with a visitor
2. **Thread**: Represents a single chat session
3. **Event**: Represents messages or system events within a thread

### Conversation States

| Status | Description |
|--------|-------------|
| `pending` | New conversation waiting for agent assignment |
| `active` | Ongoing conversation with active thread |
| `resolved` | Marked as resolved but can be reopened |
| `closed` | Fully closed conversation |

---

## Conversation List API

### GET /v1/conversations

Retrieve all conversations with filtering, sorting, and pagination.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status[]` | string[] | Filter by status | `?status[]=active&status[]=pending` |
| `channels[]` | string[] | Filter by channel | `?channels[]=web&channels[]=sms` |
| `tagIds[]` | string[] | Filter by tag IDs | `?tagIds[]=uuid1&tagIds[]=uuid2` |
| `priority` | string | Filter by priority | `?priority=high` |
| `search` | string | Search by ID, visitor name, or email | `?search=john` |
| `sortBy` | string | Sort order | `?sortBy=newest` |
| `page` | number | Page number (default: 1) | `?page=1` |
| `limit` | number | Items per page (default: 20) | `?limit=20` |
| `agentId` | string | Filter by assigned agent | `?agentId=uuid` |
| `groupId` | string | Filter by group | `?groupId=uuid` |

#### Sort Options

| Value | Description |
|-------|-------------|
| `newest` | Most recent first (default) |
| `oldest` | Oldest first |
| `unread` | Most unread messages first |
| `sla` | By SLA priority |
| `priority` | By conversation priority |

#### Request Example

```typescript
// Fetch active and pending conversations with high priority
const response = await fetch('/api/v1/conversations?' + new URLSearchParams({
  'status[]': ['active', 'pending'],
  'priority': 'high',
  'sortBy': 'newest',
  'page': '1',
  'limit': '20'
}), {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

#### Response

```json
{
  "conversations": [
    {
      "id": "conv-uuid-1",
      "status": "active",
      "visitor": {
        "id": "visitor-uuid",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "assignedAgent": {
        "id": "agent-uuid",
        "name": "Agent Smith"
      },
      "group": {
        "id": "group-uuid",
        "name": "Sales"
      },
      "tags": [
        { "id": "tag-uuid", "name": "sales", "color": "#0066ff" }
      ],
      "activeThreadId": "thread-uuid",
      "createdAt": "2026-01-13T10:00:00Z",
      "updatedAt": "2026-01-13T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

#### Frontend Implementation

```tsx
// React hook for fetching conversations with filters
const useConversations = (filters: ConversationFilters) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0 });

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.status?.length) {
        filters.status.forEach(s => params.append('status[]', s));
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.sortBy) {
        params.append('sortBy', filters.sortBy);
      }
      params.append('page', String(filters.page || 1));
      params.append('limit', String(filters.limit || 20));

      const response = await api.get(`/v1/conversations?${params}`);
      setConversations(response.data.conversations);
      setPagination({
        page: response.data.page,
        total: response.data.total
      });
      setLoading(false);
    };

    fetchConversations();
  }, [filters]);

  return { conversations, loading, pagination };
};
```

---

## Close Conversation

### POST /v1/conversations/:conversationId/close

Close an active conversation. This follows LiveChat Inc's model:
- Closes the active thread (preserves history)
- Updates conversation status to `closed`
- Adds system event for audit trail

#### Request Body

```json
{
  "reason": "resolved",
  "notes": "Customer issue resolved successfully"
}
```

#### Close Reasons

| Reason | Description |
|--------|-------------|
| `resolved` | Issue was successfully resolved |
| `spam` | Conversation was spam |
| `abandoned` | Visitor abandoned the conversation |
| `transferred` | Transferred to another channel |
| `other` | Other reason |

#### Response

```json
{
  "success": true,
  "message": "Conversation closed successfully",
  "conversation": {
    "id": "conv-uuid",
    "status": "closed",
    "activeThreadId": null
  }
}
```

#### Frontend Implementation

```tsx
const handleCloseConversation = async (conversationId: string) => {
  try {
    const response = await api.post(`/v1/conversations/${conversationId}/close`, {
      reason: 'resolved',
      notes: 'Customer inquiry resolved'
    });
    
    if (response.data.success) {
      // Remove from active chats list
      setActiveChats(prev => prev.filter(c => c.id !== conversationId));
      toast.success('Chat closed successfully');
    }
  } catch (error) {
    toast.error('Failed to close conversation');
  }
};

// UI Component
<button
  onClick={() => handleCloseConversation(chat.id)}
  className="close-chat-btn"
>
  <Archive size={16} />
  Close Chat
</button>
```

---

## Reopen Conversation

### POST /v1/conversations/:conversationId/reopen

Reopen a closed conversation. Following LiveChat Inc's model:
- Creates a NEW thread (does not reopen old thread)
- Updates conversation status to `active`
- Assigns reopening agent to conversation

#### Request Body

```json
{
  "reason": "Customer follow-up required",
  "notes": "Reopening for additional questions"
}
```

#### Response

```json
{
  "success": true,
  "message": "Conversation reopened successfully",
  "conversation": {
    "id": "conv-uuid",
    "status": "active",
    "activeThreadId": "new-thread-uuid"
  },
  "newThreadId": "new-thread-uuid"
}
```

#### Frontend Implementation

```tsx
const handleReopenConversation = async (conversationId: string) => {
  try {
    const response = await api.post(`/v1/conversations/${conversationId}/reopen`, {
      reason: 'Follow-up required'
    });
    
    if (response.data.success) {
      // Navigate to the reopened conversation
      setSelectedChatId(conversationId);
      
      // Load new thread messages
      await loadThreadMessages(response.data.newThreadId);
      
      toast.success('Conversation reopened');
    }
  } catch (error) {
    if (error.response?.status === 400) {
      toast.error('Conversation is not closed');
    } else {
      toast.error('Failed to reopen conversation');
    }
  }
};

// Archives component - Reopen button
<button
  onClick={() => handleReopenConversation(archivedChat.id)}
  className="reopen-btn"
>
  Open Chat
</button>
```

---

## Tag Management

### Add Tags to Conversation

#### POST /v1/conversations/:conversationId/tags

```json
{
  "tagIds": ["tag-uuid-1", "tag-uuid-2"]
}
```

#### Response

```json
{
  "success": true,
  "tags": [
    { "id": "tag-uuid-1", "name": "sales", "color": "#0066ff" },
    { "id": "tag-uuid-2", "name": "priority", "color": "#ff0000" }
  ]
}
```

### Remove Tag from Conversation

#### DELETE /v1/conversations/:conversationId/tags/:tagId

#### Response

```json
{
  "success": true,
  "tags": [
    { "id": "tag-uuid-1", "name": "sales", "color": "#0066ff" }
  ]
}
```

### Frontend Implementation

```tsx
// Tag management hook
const useConversationTags = (conversationId: string) => {
  const [tags, setTags] = useState<Tag[]>([]);

  const addTag = async (tagId: string) => {
    const response = await api.post(`/v1/conversations/${conversationId}/tags`, {
      tagIds: [tagId]
    });
    setTags(response.data.tags);
  };

  const removeTag = async (tagId: string) => {
    const response = await api.delete(
      `/v1/conversations/${conversationId}/tags/${tagId}`
    );
    setTags(response.data.tags);
  };

  return { tags, addTag, removeTag };
};

// Tag selector component
<TagSelector
  selectedTags={conversation.tags}
  availableTags={allTags}
  onTagSelect={(tagId) => addTag(tagId)}
  onTagRemove={(tagId) => removeTag(tagId)}
/>
```

---

## Bulk Operations

### POST /v1/conversations/bulk

Perform actions on multiple conversations at once.

#### Actions

| Action | Description | Required Fields |
|--------|-------------|-----------------|
| `close` | Close multiple conversations | `reason` (optional) |
| `assign` | Assign to an agent | `agentId` |
| `add_tag` | Add a tag | `tagId` |
| `remove_tag` | Remove a tag | `tagId` |

#### Request Body

```json
{
  "conversationIds": ["conv-1", "conv-2", "conv-3"],
  "action": "close",
  "reason": "Batch closure - end of day"
}
```

Or for assignment:

```json
{
  "conversationIds": ["conv-1", "conv-2"],
  "action": "assign",
  "agentId": "agent-uuid"
}
```

Or for tagging:

```json
{
  "conversationIds": ["conv-1", "conv-2"],
  "action": "add_tag",
  "tagId": "tag-uuid"
}
```

#### Response

```json
{
  "success": true,
  "message": "Bulk action completed: 3 succeeded, 0 failed",
  "results": [
    { "conversationId": "conv-1", "success": true },
    { "conversationId": "conv-2", "success": true },
    { "conversationId": "conv-3", "success": true }
  ]
}
```

#### Frontend Implementation

```tsx
const useBulkActions = () => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  const performBulkAction = async (
    action: 'close' | 'assign' | 'add_tag' | 'remove_tag',
    options?: { agentId?: string; tagId?: string; reason?: string }
  ) => {
    setProcessing(true);
    try {
      const response = await api.post('/v1/conversations/bulk', {
        conversationIds: Array.from(selectedIds),
        action,
        ...options
      });

      const { results } = response.data;
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      toast.success(`${successCount} conversations updated`);
      if (failCount > 0) {
        toast.warning(`${failCount} conversations failed`);
      }

      // Clear selection after successful action
      setSelectedIds(new Set());
      
      return results;
    } catch (error) {
      toast.error('Bulk action failed');
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = (ids: string[]) => {
    setSelectedIds(new Set(ids));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  return {
    selectedIds,
    processing,
    performBulkAction,
    toggleSelection,
    selectAll,
    clearSelection
  };
};

// Bulk action toolbar
{selectedIds.size > 0 && (
  <div className="bulk-actions-toolbar">
    <span>{selectedIds.size} selected</span>
    <button onClick={() => performBulkAction('close')}>
      Close All
    </button>
    <button onClick={() => setShowAssignModal(true)}>
      Assign
    </button>
    <button onClick={() => setShowTagModal(true)}>
      Add Tag
    </button>
    <button onClick={clearSelection}>
      Clear Selection
    </button>
  </div>
)}
```

---

## Firebase Real-time Updates

When conversations are closed/reopened or tags are modified, the changes are synced to Firebase for real-time updates.

### Firebase Structure

```
conversations/
  {conversationId}/
    status: "active" | "pending" | "closed" | "resolved"
    visitorId: string
    visitorName: string
    assignedAgentId: string
    assignedAgentName: string
    tags: [{ id, name, color }]
    closedBy: string (when closed)
    closedAt: string (when closed)
    reopenedBy: string (when reopened)
    reopenedAt: string (when reopened)
    messages/
      {messageId}/
        content: string
        authorType: "visitor" | "agent" | "system"
        type: "message" | "system"
        createdAt: string
```

### Listening for Updates

```tsx
import { ref, onValue } from 'firebase/database';

const useRealtimeConversation = (conversationId: string) => {
  const [conversation, setConversation] = useState(null);

  useEffect(() => {
    const conversationRef = ref(db, `conversations/${conversationId}`);
    
    const unsubscribe = onValue(conversationRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setConversation(data);
        
        // Handle status changes
        if (data.status === 'closed') {
          toast.info('This conversation has been closed');
        }
      }
    });

    return () => unsubscribe();
  }, [conversationId]);

  return conversation;
};
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Conversation is already closed",
  "error": "Bad Request"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Conversation not found",
  "error": "Not Found"
}
```

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### Frontend Error Handling

```tsx
const handleApiError = (error: AxiosError) => {
  const status = error.response?.status;
  const message = error.response?.data?.message;

  switch (status) {
    case 400:
      toast.error(message || 'Invalid request');
      break;
    case 401:
      // Redirect to login
      router.push('/login');
      break;
    case 404:
      toast.error('Conversation not found');
      break;
    case 500:
      toast.error('Server error. Please try again.');
      break;
    default:
      toast.error('An error occurred');
  }
};
```

---

## Implementation Examples

### Complete Chat List Component with All Features

```tsx
import React, { useState, useEffect } from 'react';
import { useBulkActions } from '../hooks/useBulkActions';
import { useConversations } from '../hooks/useConversations';

interface Filters {
  status: string[];
  channel: string[];
  tags: string[];
  search: string;
  sortBy: string;
  page: number;
}

const ChatList: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({
    status: [],
    channel: [],
    tags: [],
    search: '',
    sortBy: 'newest',
    page: 1,
  });

  const { conversations, loading, pagination } = useConversations(filters);
  const { 
    selectedIds, 
    toggleSelection, 
    performBulkAction, 
    clearSelection 
  } = useBulkActions();

  // Filter handlers
  const toggleStatusFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
      page: 1, // Reset to first page
    }));
  };

  // Search handler
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query, page: 1 }));
  };

  // Sort handler
  const handleSort = (sortBy: string) => {
    setFilters(prev => ({ ...prev, sortBy }));
  };

  // Pagination handler
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  return (
    <div className="chat-list">
      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by ID, name, or keywords..."
          value={filters.search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <span>Status:</span>
          {['active', 'pending', 'closed'].map(status => (
            <button
              key={status}
              className={filters.status.includes(status) ? 'active' : ''}
              onClick={() => toggleStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="sort-options">
          <select 
            value={filters.sortBy} 
            onChange={(e) => handleSort(e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="unread">Unread</option>
            <option value="priority">Priority</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bulk-toolbar">
          <span>{selectedIds.size} selected</span>
          <button onClick={() => performBulkAction('close')}>
            Close Selected
          </button>
          <button onClick={() => performBulkAction('add_tag', { tagId: 'some-tag-id' })}>
            Tag Selected
          </button>
          <button onClick={clearSelection}>
            Clear
          </button>
        </div>
      )}

      {/* Conversation List */}
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="conversations">
          {conversations.map(conversation => (
            <ChatListItem
              key={conversation.id}
              conversation={conversation}
              selected={selectedIds.has(conversation.id)}
              onSelect={() => toggleSelection(conversation.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="pagination">
        <button 
          disabled={filters.page === 1}
          onClick={() => handlePageChange(filters.page - 1)}
        >
          Previous
        </button>
        <span>Page {pagination.page} of {Math.ceil(pagination.total / 20)}</span>
        <button 
          disabled={filters.page >= Math.ceil(pagination.total / 20)}
          onClick={() => handlePageChange(filters.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

---

## API Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/conversations` | List conversations with filters |
| GET | `/v1/conversations/:id` | Get single conversation |
| POST | `/v1/conversations/:id/close` | Close conversation |
| POST | `/v1/conversations/:id/reopen` | Reopen conversation |
| POST | `/v1/conversations/:id/tags` | Add tags |
| DELETE | `/v1/conversations/:id/tags/:tagId` | Remove tag |
| POST | `/v1/conversations/bulk` | Bulk operations |

---

## Summary

This guide covers all the chat management features:

1. ✅ **Multichannel conversation list** - GET /v1/conversations with status filtering
2. ✅ **Filters** - Status, channel, tags, priority filters
3. ✅ **Sorting options** - Newest, oldest, unread, SLA, priority
4. ✅ **Search** - Search by ID, visitor name, keywords
5. ✅ **Bulk actions** - Close, assign, tag, remove tag
6. ✅ **Conversation closure** - POST /v1/conversations/:id/close
7. ✅ **Reopen conversation** - POST /v1/conversations/:id/reopen

All endpoints are protected with JWT authentication and sync changes to Firebase for real-time updates.
