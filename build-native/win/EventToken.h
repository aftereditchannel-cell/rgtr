// EventToken.h — تعریف استاندارد ویندوز (Windows::Foundation::EventRegistrationToken)
// مطابق SDK مایکروسافت؛ فقط همین یک struct است.
#pragma once

#ifndef _EVENTTOKEN_H_
#define _EVENTTOKEN_H_

#ifdef __cplusplus
namespace Windows {
namespace Foundation {
struct EventRegistrationToken {
  __int64 value;
};
}  // namespace Foundation
}  // namespace Windows
#endif  // __cplusplus

typedef struct EventRegistrationToken EventRegistrationToken;

#endif  // _EVENTTOKEN_H_
