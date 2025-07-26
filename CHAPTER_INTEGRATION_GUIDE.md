# Chapter Integration Guide

## Quick Start: Using the New Chapter System

The Subject → Chapter → Topic hierarchy has been successfully implemented. Here's how to integrate and use the new functionality:

## 1. Using the Chapter Hooks

### Basic Chapter Management
```typescript
import { useChapters } from '../hooks/useChapters';

function ChapterManager({ subjectId }: { subjectId: string }) {
  const { 
    chapters, 
    loading, 
    error, 
    createChapter, 
    updateChapter, 
    deleteChapter 
  } = useChapters(subjectId);

  // Create a new chapter
  const handleCreateChapter = async () => {
    const newChapter = await createChapter({
      subject_id: subjectId,
      title: 'New Chapter',
      description: 'Chapter description',
      syllabus_code: '8',
      curriculum_board: 'Cambridge IGCSE',
      tier: 'Core',
      estimated_study_time_minutes: 120,
      learning_objectives: ['Objective 1', 'Objective 2'],
      is_published: true,
      is_active: true
    });
  };

  return (
    <div>
      {chapters.map(chapter => (
        <div key={chapter.id}>{chapter.title}</div>
      ))}
    </div>
  );
}
```

### Chapter-Based Topic Management
```typescript
import { useTopics } from '../hooks/useTopics';

function ChapterTopics({ subjectId, chapterId }: { subjectId: string, chapterId: string }) {
  // Get topics for a specific chapter
  const { topics, loading, error } = useTopics(subjectId, chapterId);

  // Get all topics organized by chapter
  const { getTopicsByChapter } = useTopics(subjectId);
  
  const loadTopicsByChapter = async () => {
    const topicsByChapter = await getTopicsByChapter(subjectId);
    // topicsByChapter[chapterId].topics contains the topics for this chapter
  };

  return (
    <div>
      {topics.map(topic => (
        <div key={topic.id}>{topic.title}</div>
      ))}
    </div>
  );
}
```

## 2. Using the Chapter Components

### Chapter List Component
```typescript
import ChapterList from '../components/admin/ChapterList';

function AdminChapters({ subjectId }: { subjectId: string }) {
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

  return (
    <ChapterList
      subjectId={subjectId}
      onChapterSelect={setSelectedChapter}
      onChapterEdit={(chapter) => {
        // Handle chapter editing
        console.log('Edit chapter:', chapter);
      }}
      onChapterDelete={(chapterId) => {
        // Handle chapter deletion
        console.log('Delete chapter:', chapterId);
      }}
      selectedChapter={selectedChapter}
    />
  );
}
```

### Chapter Form Component
```typescript
import ChapterForm from '../components/admin/ChapterForm';

function ChapterEditor({ subjectId, chapter }: { subjectId: string, chapter?: Chapter }) {
  return (
    <ChapterForm
      subjectId={subjectId}
      chapter={chapter} // null for create, Chapter object for edit
      onSave={(savedChapter) => {
        console.log('Chapter saved:', savedChapter);
      }}
      onCancel={() => {
        console.log('Chapter editing cancelled');
      }}
    />
  );
}
```

## 3. Database Queries

### Get Chapter Statistics
```sql
-- Get statistics for a specific chapter
SELECT * FROM get_chapter_stats('chapter-uuid-here');
```

### Get Chapters with Topic Counts
```sql
SELECT 
  c.*,
  COUNT(t.id) as topic_count,
  SUM(t.estimated_study_time_minutes) as total_study_time
FROM chapters c
LEFT JOIN topics t ON c.id = t.chapter_id
WHERE c.subject_id = 'subject-uuid-here'
GROUP BY c.id
ORDER BY c.display_order;
```

### Get Topics by Chapter
```sql
SELECT 
  c.title as chapter_title,
  t.title as topic_title,
  t.estimated_study_time_minutes
FROM chapters c
JOIN topics t ON c.id = t.chapter_id
WHERE c.subject_id = 'subject-uuid-here'
ORDER BY c.display_order, t.display_order;
```

## 4. Migration to Other Subjects

To extend the chapter system to other subjects (Physics, Chemistry, Biology, Economics):

### Step 1: Create Chapters for Subject
```sql
-- Example for Physics
INSERT INTO chapters (subject_id, title, description, slug, syllabus_code, display_order)
SELECT 
  s.id,
  'Physics Chapter 1',
  'Description here',
  'physics-chapter-1',
  '1',
  1
FROM subjects s WHERE s.code = 'PHYS';
```

### Step 2: Assign Topics to Chapters
```sql
-- Update topics to reference chapters based on major_area
UPDATE topics 
SET chapter_id = c.id
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE topics.subject_id = c.subject_id
  AND topics.major_area = c.title
  AND s.code = 'PHYS';
```

## 5. Backward Compatibility

The system maintains full backward compatibility:

- **Existing APIs**: All existing topic-based APIs continue to work
- **Quiz Generation**: Existing quiz generation works unchanged
- **Progress Tracking**: User progress data is preserved
- **Topic Management**: All existing topic operations work as before

### Gradual Migration Approach
```typescript
// Check if a subject has chapters
const hasChapters = chapters.length > 0;

if (hasChapters) {
  // Use new chapter-based UI
  return <ChapterBasedInterface />;
} else {
  // Fall back to legacy topic-only UI
  return <LegacyTopicInterface />;
}
```

## 6. Best Practices

### Error Handling
```typescript
const { chapters, loading, error } = useChapters(subjectId);

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!subjectId) return <SelectSubjectPrompt />;
```

### Performance Optimization
```typescript
// Use chapter-based filtering for better performance
const { topics } = useTopics(subjectId, selectedChapterId);

// Instead of loading all topics and filtering client-side
// const allTopics = useTopics(subjectId);
// const filteredTopics = allTopics.filter(t => t.chapter_id === selectedChapterId);
```

### Type Safety
```typescript
import { Chapter, ChapterFormData } from '../types/chapter';

// Always use the provided types for type safety
const createChapter = (data: ChapterFormData): Promise<Chapter> => {
  // Implementation
};
```

## 7. Testing the Implementation

### Verify Chapter Creation
1. Use the ChapterForm component to create a new chapter
2. Check that the chapter appears in ChapterList
3. Verify database record creation

### Verify Topic Assignment
1. Create topics and assign them to chapters
2. Use chapter-based topic filtering
3. Verify hierarchical relationships

### Verify Statistics
1. Check chapter statistics using get_chapter_stats()
2. Verify topic counts and study time calculations
3. Test quiz and flashcard associations

## 8. Next Steps

1. **Admin Interface Integration**: Add chapter management to the main admin page
2. **Student Interface**: Implement chapter navigation in student-facing pages
3. **Chapter-Based Quiz Generation**: Extend quiz generation to work with chapters
4. **Progress Tracking**: Implement chapter-level progress tracking
5. **Content Organization**: Use chapters for better content discovery

The chapter system is now ready for production use and can be gradually rolled out across all subjects while maintaining full backward compatibility.
