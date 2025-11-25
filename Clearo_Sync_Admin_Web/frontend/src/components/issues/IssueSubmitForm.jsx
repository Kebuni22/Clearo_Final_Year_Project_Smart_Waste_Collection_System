import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { createIssueNotification } from '../../utils/notificationHelper';

const IssueSubmitForm = ({ user }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'normal',
    location: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create the issue document
      const issueRef = await addDoc(collection(db, 'issues'), {
        ...formData,
        userId: user.uid,
        userName: user.displayName || user.email,
        userEmail: user.email,
        status: 'pending',
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      console.log('Issue created:', issueRef.id);

      // 2. Create notification for admin
      await createIssueNotification(
        {
          id: issueRef.id,
          ...formData,
        },
        {
          uid: user.uid,
          name: user.displayName || user.email,
          email: user.email,
        }
      );

      alert('✅ Issue submitted successfully! Admin will be notified.');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        priority: 'normal',
        location: ''
      });

    } catch (error) {
      console.error('Error submitting issue:', error);
      alert('❌ Failed to submit issue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}
      <input
        type="text"
        placeholder="Issue Title"
        value={formData.title}
        onChange={(e) => setFormData({...formData, title: e.target.value})}
        required
      />
      
      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
        required
      />
      
      <select
        value={formData.category}
        onChange={(e) => setFormData({...formData, category: e.target.value})}
        required
      >
        <option value="">Select Category</option>
        <option value="Waste Collection">Waste Collection</option>
        <option value="Recycling">Recycling</option>
        <option value="Illegal Dumping">Illegal Dumping</option>
        <option value="Other">Other</option>
      </select>
      
      <select
        value={formData.priority}
        onChange={(e) => setFormData({...formData, priority: e.target.value})}
      >
        <option value="normal">Normal</option>
        <option value="urgent">Urgent</option>
        <option value="immediate">Immediate</option>
      </select>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Issue'}
      </button>
    </form>
  );
};

export default IssueSubmitForm;