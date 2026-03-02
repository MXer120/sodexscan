'use client'

import React, { useState } from 'react'
import { useModGuard } from '../hooks/useModGuard'
import { useSessionContext } from '../lib/SessionContext'
import AdminPages from './admin/AdminPages'
import AdminNavbar from './admin/AdminNavbar'
import AdminAnnouncements from './admin/AdminAnnouncements'
import AdminSoPoints from './admin/AdminSoPoints'
import AdminCms from './admin/AdminCms'
import AdminSettings from './admin/AdminSettings'
import '../styles/Admin.css'

const BASE_TABS = [
  { id: 'pages', label: 'Pages' },
  { id: 'navbar', label: 'Navbar' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'sopoints', label: 'SoPoints' },
  { id: 'cms', label: 'CMS' },
]

export default function AdminPage() {
  const { isAllowed, loading } = useModGuard()
  const { isOwner } = useSessionContext()
  const [activeTab, setActiveTab] = useState('pages')

  const tabs = isOwner ? [...BASE_TABS, { id: 'settings', label: 'Settings' }] : BASE_TABS

  if (loading) {
    return (
      <div className="admin-page">
        <p className="admin-loading">Loading...</p>
      </div>
    )
  }

  if (!isAllowed) return null

  return (
    <div className="admin-page">
      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-panel">
        {activeTab === 'pages' && <AdminPages />}
        {activeTab === 'navbar' && <AdminNavbar />}
        {activeTab === 'announcements' && <AdminAnnouncements />}
        {activeTab === 'sopoints' && <AdminSoPoints />}
        {activeTab === 'cms' && <AdminCms />}
        {activeTab === 'settings' && isOwner && <AdminSettings />}
      </div>
    </div>
  )
}
