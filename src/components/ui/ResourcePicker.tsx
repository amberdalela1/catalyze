import { useState, useMemo } from 'react';
import { RESOURCE_CATEGORIES, STANDARD_RESOURCES } from '../../utils/resources';
import { CheckIcon } from './Icons';
import styles from './ResourcePicker.module.css';

interface ResourcePickerProps {
  label: string;
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export default function ResourcePicker({ label, selected, onChange, placeholder }: ResourcePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  // Track which selected items are custom (not in standard list)
  const customItems = selected.filter(s => !STANDARD_RESOURCES.includes(s));

  const toggleCategory = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleResource = (resource: string) => {
    if (selected.includes(resource)) {
      onChange(selected.filter(s => s !== resource));
    } else {
      onChange([...selected, resource]);
    }
  };

  const addCustom = () => {
    const val = customValue.trim();
    if (val && !selected.includes(val)) {
      onChange([...selected, val]);
      setCustomValue('');
    }
  };

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return RESOURCE_CATEGORIES;
    const q = search.toLowerCase();
    const filtered: Record<string, string[]> = {};
    for (const [cat, items] of Object.entries(RESOURCE_CATEGORIES)) {
      const matchedItems = items.filter(item => item.toLowerCase().includes(q));
      if (matchedItems.length > 0 || cat.toLowerCase().includes(q)) {
        filtered[cat] = matchedItems.length > 0 ? matchedItems : items;
      }
    }
    return filtered;
  }, [search]);

  return (
    <div className={styles.picker}>
      <div className={styles.selectedList}>
        {selected.map(item => (
          <span key={item} className={styles.chip}>
            {item}
            <button className={styles.chipRemove} onClick={() => toggleResource(item)}>×</button>
          </span>
        ))}
        <button
          type="button"
          className={styles.addButton}
          onClick={() => setOpen(true)}
        >
          + {placeholder || `Add ${label}`}
        </button>
      </div>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <button className={styles.dropdownClose} onClick={() => setOpen(false)}>←</button>
            <span className={styles.dropdownTitle}>{label}</span>
            <button className={styles.dropdownDone} onClick={() => setOpen(false)}>
              Done ({selected.length})
            </button>
          </div>

          <div className={styles.searchBar}>
            <input
              className={styles.searchInput}
              placeholder="Search resources..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.dropdownBody}>
            {Object.entries(filteredCategories).map(([category, items]) => {
              const selectedInCat = items.filter(i => selected.includes(i)).length;
              const isExpanded = expandedCats.has(category) || search.trim().length > 0;

              return (
                <div key={category} className={styles.categoryGroup}>
                  <div
                    className={styles.categoryHeader}
                    onClick={() => toggleCategory(category)}
                  >
                    <span>
                      {category}
                      {selectedInCat > 0 && (
                        <span className={styles.categoryCount}>({selectedInCat} selected)</span>
                      )}
                    </span>
                    <span className={`${styles.categoryArrow} ${isExpanded ? styles.categoryArrowOpen : ''}`}>
                      ▼
                    </span>
                  </div>
                  {isExpanded && items.map(item => (
                    <div
                      key={item}
                      className={styles.resourceItem}
                      onClick={() => toggleResource(item)}
                    >
                      <span className={`${styles.checkbox} ${selected.includes(item) ? styles.checkboxChecked : ''}`}>
                        {selected.includes(item) && <CheckIcon size={14} />}
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Show custom items that aren't in standard list */}
            {customItems.length > 0 && (
              <div className={styles.categoryGroup}>
                <div className={styles.categoryHeader}>
                  <span>Custom <span className={styles.categoryCount}>({customItems.length} selected)</span></span>
                </div>
                {customItems.map(item => (
                  <div
                    key={item}
                    className={styles.resourceItem}
                    onClick={() => toggleResource(item)}
                  >
                    <span className={`${styles.checkbox} ${styles.checkboxChecked}`}><CheckIcon size={14} /></span>
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.customInput}>
            <input
              className={styles.customField}
              placeholder="Add custom resource..."
              value={customValue}
              onChange={e => setCustomValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
            />
            <button className={styles.customAdd} onClick={addCustom}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}
