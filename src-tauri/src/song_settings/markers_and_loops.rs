use serde::{Deserialize, Serialize};

use super::SongSettings;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Marker {
    #[serde(default)]
    pub id: u32,
    pub name: String,
    pub seconds: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedLoop {
    pub id: u32,
    pub name: String,
    pub start_marker_id: u32,
    pub end_marker_id: u32,
    pub speed_percent: f64,
}

impl SongSettings {
    pub fn repaired(mut self) -> Self {
        let mut used_ids = Vec::new();
        for index in 0..self.markers.len() {
            if self.markers[index].id == 0 || used_ids.contains(&self.markers[index].id) {
                self.markers[index].id = self.next_id();
            }
            used_ids.push(self.markers[index].id);
        }
        let playable_loop_ids: Vec<u32> =
            self.loops.iter().filter(|saved| self.loop_seconds(saved).is_some()).map(|saved| saved.id).collect();
        self.loops.retain(|saved| playable_loop_ids.contains(&saved.id));
        if self.active_loop().is_none() {
            self.activate_loop(None);
        }
        self.sort_markers();
        self
    }

    pub fn add_marker(&mut self, seconds: f64) -> u32 {
        let name = self.unused_name("Marker", |settings, name| settings.markers.iter().any(|marker| marker.name == name));
        self.insert_marker(name, seconds)
    }

    pub fn rename_marker(&mut self, marker_id: u32, name: String) {
        if let Some(marker) = self.markers.iter_mut().find(|marker| marker.id == marker_id) {
            marker.name = name;
        }
    }

    pub fn delete_marker(&mut self, marker_id: u32) -> Vec<String> {
        self.markers.retain(|marker| marker.id != marker_id);
        let (removed, kept): (Vec<SavedLoop>, Vec<SavedLoop>) = std::mem::take(&mut self.loops)
            .into_iter()
            .partition(|saved| saved.start_marker_id == marker_id || saved.end_marker_id == marker_id);
        self.loops = kept;
        if removed.iter().any(|saved| Some(saved.id) == self.active_loop_id) {
            self.active_loop_id = None;
        }
        removed.into_iter().map(|saved| saved.name).collect()
    }

    pub fn add_loop(&mut self, start_marker_id: u32, end_marker_id: u32) -> Option<u32> {
        let (start, end) = (self.marker_seconds(start_marker_id)?, self.marker_seconds(end_marker_id)?);
        if start >= end {
            return None;
        }
        let name = self.next_loop_name();
        Some(self.insert_loop(name, start_marker_id, end_marker_id))
    }

    pub fn add_loop_from_range(&mut self, start_seconds: f64, end_seconds: f64) -> u32 {
        let name = self.next_loop_name();
        let start_marker_id = self.insert_marker(format!("{name} start"), start_seconds.min(end_seconds));
        let end_marker_id = self.insert_marker(format!("{name} end"), start_seconds.max(end_seconds));
        self.insert_loop(name, start_marker_id, end_marker_id)
    }

    pub fn rename_loop(&mut self, loop_id: u32, name: String) {
        if let Some(saved) = self.loops.iter_mut().find(|saved| saved.id == loop_id) {
            saved.name = name;
        }
    }

    pub fn delete_loop(&mut self, loop_id: u32) {
        self.loops.retain(|saved| saved.id != loop_id);
        if self.active_loop_id == Some(loop_id) {
            self.active_loop_id = None;
        }
    }

    pub fn activate_loop(&mut self, loop_id: Option<u32>) {
        self.active_loop_id = loop_id.filter(|id| self.loops.iter().any(|saved| saved.id == *id));
        self.is_loop_enabled = self.active_loop_id.is_some();
        self.trainer.is_enabled = false;
    }

    pub fn active_loop(&self) -> Option<&SavedLoop> {
        self.loops.iter().find(|saved| Some(saved.id) == self.active_loop_id)
    }

    pub(super) fn active_loop_mut(&mut self) -> Option<&mut SavedLoop> {
        let active_loop_id = self.active_loop_id;
        self.loops.iter_mut().find(|saved| Some(saved.id) == active_loop_id)
    }

    pub fn loop_seconds(&self, saved: &SavedLoop) -> Option<(f64, f64)> {
        let start = self.marker_seconds(saved.start_marker_id)?;
        let end = self.marker_seconds(saved.end_marker_id)?;
        (start < end).then_some((start, end))
    }

    fn insert_marker(&mut self, name: String, seconds: f64) -> u32 {
        let id = self.next_id();
        self.markers.push(Marker { id, name, seconds: seconds.max(0.0) });
        self.sort_markers();
        id
    }

    fn insert_loop(&mut self, name: String, start_marker_id: u32, end_marker_id: u32) -> u32 {
        let id = self.next_id();
        let speed_percent = self.current_speed();
        self.loops.push(SavedLoop { id, name, start_marker_id, end_marker_id, speed_percent });
        self.activate_loop(Some(id));
        id
    }

    fn marker_seconds(&self, marker_id: u32) -> Option<f64> {
        self.markers.iter().find(|marker| marker.id == marker_id).map(|marker| marker.seconds)
    }

    fn next_loop_name(&self) -> String {
        self.unused_name("Loop", |settings, name| settings.loops.iter().any(|saved| saved.name == name))
    }

    fn unused_name(&self, prefix: &str, is_taken: impl Fn(&Self, &str) -> bool) -> String {
        (1..)
            .map(|number| format!("{prefix} {number}"))
            .find(|name| !is_taken(self, name))
            .expect("an unused name always exists")
    }

    fn next_id(&self) -> u32 {
        let marker_ids = self.markers.iter().map(|marker| marker.id);
        let loop_ids = self.loops.iter().map(|saved| saved.id);
        marker_ids.chain(loop_ids).max().unwrap_or(0) + 1
    }

    fn sort_markers(&mut self) {
        self.markers.sort_by(|left, right| left.seconds.total_cmp(&right.seconds));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn markers_stay_in_time_order_with_unique_ids() {
        let mut settings = SongSettings::default();
        let late = settings.add_marker(30.0);
        let early = settings.add_marker(10.0);
        assert_ne!(late, early);
        let times: Vec<f64> = settings.markers.iter().map(|marker| marker.seconds).collect();
        assert_eq!(times, vec![10.0, 30.0]);
    }

    #[test]
    fn dragged_range_creates_named_markers_and_an_active_loop() {
        let mut settings = SongSettings::default();
        let loop_id = settings.add_loop_from_range(8.0, 4.0);
        let names: Vec<&str> = settings.markers.iter().map(|marker| marker.name.as_str()).collect();
        assert_eq!(names, vec!["Loop 1 start", "Loop 1 end"]);
        assert_eq!(settings.active_loop_id, Some(loop_id));
        assert_eq!(settings.looping_seconds(), Some((4.0, 8.0)));
    }

    #[test]
    fn loop_between_markers_must_run_forwards() {
        let mut settings = SongSettings::default();
        let verse = settings.add_marker(10.0);
        let chorus = settings.add_marker(20.0);
        assert_eq!(settings.add_loop(chorus, verse), None);
        assert!(settings.add_loop(verse, chorus).is_some());
    }

    #[test]
    fn new_loop_starts_at_the_current_speed() {
        let mut settings = SongSettings::default();
        settings.set_current_speed(60.0);
        settings.add_loop_from_range(1.0, 2.0);
        assert_eq!(settings.active_loop().unwrap().speed_percent, 60.0);
    }

    #[test]
    fn deleting_a_marker_deletes_its_loops_and_reports_them() {
        let mut settings = SongSettings::default();
        let verse = settings.add_marker(10.0);
        let chorus = settings.add_marker(20.0);
        let solo = settings.add_marker(30.0);
        settings.add_loop(verse, chorus);
        settings.rename_loop(settings.active_loop_id.unwrap(), "verse lick".into());
        settings.add_loop(chorus, solo);
        settings.add_loop(verse, solo);
        let removed = settings.delete_marker(chorus);
        assert_eq!(removed, vec!["verse lick".to_string(), "Loop 1".to_string()]);
        assert_eq!(settings.loops.len(), 1);
    }

    #[test]
    fn deleting_the_active_loops_marker_clears_the_active_loop() {
        let mut settings = SongSettings::default();
        settings.add_loop_from_range(1.0, 2.0);
        let start_marker_id = settings.active_loop().unwrap().start_marker_id;
        settings.delete_marker(start_marker_id);
        assert_eq!(settings.active_loop_id, None);
        assert_eq!(settings.looping_seconds(), None);
    }

    #[test]
    fn loop_names_reuse_the_lowest_free_number() {
        let mut settings = SongSettings::default();
        let first = settings.add_loop_from_range(1.0, 2.0);
        settings.add_loop_from_range(3.0, 4.0);
        settings.delete_loop(first);
        settings.add_loop_from_range(5.0, 6.0);
        let names: Vec<&str> = settings.loops.iter().map(|saved| saved.name.as_str()).collect();
        assert_eq!(names, vec!["Loop 2", "Loop 1"]);
    }

    #[test]
    fn repair_gives_old_markers_unique_ids() {
        let old_file = r#"{"markers": [{"name": "intro", "seconds": 1.0}, {"name": "solo", "seconds": 2.0}]}"#;
        let settings: SongSettings = serde_json::from_str(old_file).unwrap();
        let repaired = settings.repaired();
        assert_ne!(repaired.markers[0].id, repaired.markers[1].id);
        assert!(repaired.markers.iter().all(|marker| marker.id != 0));
    }

    #[test]
    fn repair_keeps_the_old_song_speed() {
        let settings: SongSettings = serde_json::from_str(r#"{"speedPercent": 48}"#).unwrap();
        assert_eq!(settings.repaired().song_speed_percent, 48.0);
    }
}
