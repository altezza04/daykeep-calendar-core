import dashHas from 'lodash.has'
import DateTime from 'luxon/src/datetime'

const debug = require('debug')('calendar:CalendarEventDetail')

export default {
  props: {
    fieldColor: {
      type: String,
      default: 'grey-2',
    },
  },
  data() {
    return {
      modalIsOpen: false,
      inEditMode: false,
      editEventObject: {},
      startDateObject: new Date(),
      startTimeObject: new Date(),
      endDateObject: new Date(),
      endTimeObject: new Date(),
    };
  },
  computed: {
    countAttendees: function () {
      if (!dashHas(this.eventObject, 'attendees')) {
        return 0;
      }
      let count = this.eventObject.attendees.length;
      for (const thisAttendee of this.eventObject.attendees) {
        if (dashHas(thisAttendee, 'resource') && thisAttendee.resource) {
          count--;
        }
      }
      return count;
    },
    countResources: function () {
      if (!dashHas(this.eventObject, 'attendees')) {
        return 0;
      }
      let count = 0;
      for (const thisAttendee of this.eventObject.attendees) {
        debug('thisAttendee = ', thisAttendee);
        if (dashHas(thisAttendee, 'resource') && thisAttendee.resource) {
          count++;
        }
      }
      return count;
    },
    getTopColorClasses: function () {
      return this.addCssColorClasses(
        {
          'full-width': true,
          'full-height': true,
          'q-pr-md': true,
          // 'q-py-md': true,
          // 'q-py-none': true,
          // 'q-mt-sm': true,
          'relative-position': true,
          'ced-top': true,
        },
        this.eventObject
      );
    },
    eventColor: function () {
      return this.getEventColor(this.eventObject, 'color');
    },
    getEventStyle: function () {
      return {
        // 'background-color': this.backgroundColor,
        // 'color': this.textColor
      };
    },
    getEventClass: function () {
      return this.addCssColorClasses(
        {
          'calendar-event': true,
          'calendar-event-month': this.monthStyle,
        },
        this.eventObject
      );
    },
    isEditingAllowed: function () {
      if (dashHas(this.eventObject, 'allowEditing')) {
        return this.eventObject.allowEditing;
      }
      return this.allowEditing;
    },
    isNewEvent: function () {
      if (dashHas(this.eventObject, 'newEvent')) {
        return this.eventObject.newEvent;
      }
      return this.newEvent;
    },
  },
  methods: {
    dashHas: dashHas, // set this so we can easily use it in a template
    textExists: function (fieldLocation) {
      return dashHas(this.eventObject, fieldLocation) && this.eventObject[fieldLocation] != null && this.eventObject[fieldLocation].length > 0;
    },
    __open: function () {
      this.modalIsOpen = true;
    },
    __close: function () {
      this.modalIsOpen = false;
      this.inEditMode = false;
    },
    startEditMode: function () {
      console.log(this.eventObject)
      this.editEventObject = this.eventObject;
      // fixes for any values that will cause errors
      if (!dashHas(this.editEventObject, 'start.isAllDay')) {
        this.editEventObject.start.isAllDay = false;
      }
      let dateObj = {};
      if (typeof this.editEventObject.start.dateObject.toJSDate === 'function') {
        dateObj = this.editEventObject.start.dateObject.toJSDate();
      } else {
        dateObj = this.editEventObject.start.dateObject;
      }
      this.startDateObject = dateObj;
      this.startTimeObject = dateObj;
      if (dashHas(this.editEventObject, 'end.dateObject')) {
        if (typeof this.editEventObject.end.dateObject.toJSDate === 'function') {
          dateObj = this.editEventObject.end.dateObject.toJSDate();
        } else {
          dateObj = this.editEventObject.end.dateObject;
        }
        this.endDateObject = dateObj;
        this.endTimeObject = dateObj;
      }
      this.inEditMode = true;
    },
    checkEndAfterStart: function () {
      const startDate = this.makeDT(this.startDateObject);
      let endDate = this.makeDT(this.endDateObject);
      const daysDiff = startDate.diff(endDate).as('days');
      if (Math.floor(daysDiff) >= 0) {
        endDate = endDate.set({
          year: startDate.year,
          month: startDate.month,
          day: startDate.day,
        });
        this.endDateObject = endDate.toJSDate();
        // now check minutes
        const startTime = this.makeDT(this.startTimeObject);
        let endTime = this.makeDT(this.endTimeObject);
        const minutesDiff = startTime.diff(endTime).as('minutes');
        if (Math.floor(minutesDiff) > 0) {
          endTime = endTime.set({
            year: startDate.year,
            month: startDate.month,
            day: startDate.day,
            hour: startTime.hour,
            minute: startTime.minute,
          });
        }
        this.endTimeObject = endTime.toJSDate();
      }
    },
    __save: function () {
      // convert elements back to parsed format
      const stepList = ['start', 'end'];
      const isAllDay = this.editEventObject.start.isAllDay;

      for (const step of stepList) {
        let dateObj = DateTime.fromJSDate(this[step + 'DateObject']);
        if (isAllDay) {
          this.editEventObject[step] = {
            date: dateObj.toISODate(),
          };
        } else {
          const timeObj = this[step + 'TimeObject'];
          dateObj = dateObj.set({
            hour: timeObj.getHours(),
            minute: timeObj.getMinutes(),
            second: timeObj.getSeconds(),
          });
          this.editEventObject[step] = {
            dateTime: dateObj.toISO(),
          };
        }
      }

      // strip out calculated fields
      const fieldList = ['daysFromStart', 'durationDays', 'hasNext', 'hasPrev', 'slot', 'allowEditing', 'newEvent'];
      for (const thisField of fieldList) {
        delete this.editEventObject[thisField];
      }

      // done modifying
      this.eventObject = this.editEventObject;
      this.$root.$emit('update-event-' + this.eventRef, this.eventObject);
      this.__close();
    },
    __delete: function () {
      this.$root.$emit('delete-event-' + this.eventRef, this.eventObject);
      this.__close();
    },
  },
  mounted() {
    debug('Component mounted');
  },
};
